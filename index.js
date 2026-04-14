const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://calistenia.australkungfu.com/");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const LIBRARY = `
EMPUJE HORIZONTAL: Pushup Con Kettlebell, Pushup Con Inestabilidad, Flexiones abertura neutra, Flexiones abertura amplia, Flexiones con rodillas apoyadas, Flexiones inclinadas, Flexiones declinadas, Flexiones explosivas, Flexiones diamante, Flexiones espartanas, Flexiones hindúes, Flexiones Spiderman, Flexiones arqueras, Flexiones a una mano, Pseudo push ups
EMPUJE VERTICAL: Pike push ups, Pike push ups con elevación, Flexiones de pino, Press Militar Con Banda Elastica
FONDOS: Fondos en paralelas, Fondos negativos, Fondos con banda, Fondos explosivos, Fondos en banco, Bar dips, Muscle up con salto
TRACCIÓN HORIZONTAL: Remo Con Banda, Remo en L, Australian pull ups prono, Remo invertido en barra, Australian pull ups supino
TRACCIÓN VERTICAL: Dominadas abertura neutra, Dominadas abertura amplia, Dominadas en supinación, Dominadas con salto, Dominadas negativas, Dominadas asistidas, Dominadas explosivas, High pull ups, Muscle up
TREN INFERIOR: Sentadilla, Sentadilla asistida, Sentadilla con salto, Sentadilla búlgara, Pistol squat, Pistol squat en banco, Estocadas, Estocadas con desplazamiento, Subida al banco a una pierna, Gemelos con déficit, Hip thrust, Puente de glúteo, Peso muerto a una pierna, Frog pump
CORE: Burpees, Plancha Abdominal, Plancha Dinámica, Deadbug, Hollow Plank, Rueda Abdominal, Crunch Abdominal, Escalador, Pallof Press, Caminata del Granjero
QIGONG/KUNG FU (OBLIGATORIO 1 por día, variarlo): Mabu, Zhan Zhuang, Ba Duan Jin 1-Dos Manos Sostienen el Cielo, Ba Duan Jin 2-Tensar el Arco, Ba Duan Jin 3-Separar Cielo y Tierra, Ba Duan Jin 4-Mirar hacia Atrás, Ba Duan Jin 5- En Mabu hacer círculos con la cabeza, Ba Duan Jin 6-Tocar los Pies, Ba Duan Jin 7-Puños con Yi enfocada, Ba Duan Jin 8-Sacudir el Cuerpo, SanTiShi La postura de 3 cuerpos, JinJiDuLi, La Sao
`;

app.post("/proxy", async (req, res) => {
  try {
    const originalMessage = req.body.messages?.[0]?.content || "";
    const atletaMatch = originalMessage.match(/DATOS DEL ATLETA:([\s\S]*?)EVALUACIÓN INICIAL:/);
    const evalMatch = originalMessage.match(/EVALUACIÓN INICIAL:([\s\S]*?)BIBLIOTECA DE EJERCICIOS:/);
    const datosAtleta = atletaMatch ? atletaMatch[1].trim() : "";
    const evaluacion = evalMatch ? evalMatch[1].trim() : "";

    const prompt = `Eres entrenador experto en calistenia marcial de la academia Austral Kung Fu (artes marciales chinas y Tai Chi Chuan).

DATOS DEL ATLETA:
${datosAtleta}

EVALUACIÓN INICIAL:
${evaluacion}

EJERCICIOS DISPONIBLES:
${LIBRARY}

REGLAS:
1. SIEMPRE incluir 1 ejercicio de Qigong/Kung Fu por rutina.
2. Calibrar nivel real según evaluación inicial.
3. Asignar tags según condiciones del atleta. Qigong siempre lleva tag "Chi/Energía".
4. RPE: principiante 5-6, intermedio 6-8, avanzado 7-9.
5. Descansos: fuerza 90-180s, resistencia 30-60s, hipertrofia 60-90s.
6. Máximo 10 ejercicios por día.
7. Responder SOLO con JSON válido sin markdown ni texto extra.
8. La sesión completa debe durar aproximadamente 45 minutos. Calculá series, reps y descansos en consecuencia.

Formato JSON requerido:
{"athlete":"","level":"","program_name":"","days":[{"day":"","focus":"","exercises":[{"name":"","sets":3,"reps":"","rpe":7,"rest_seconds":90,"tags":[],"notes":""}]}],"general_notes":""}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
        temperature: 0.7
      })
    });

    const data = await response.json();
    console.log("Groq response:", JSON.stringify(data).substring(0, 300));

    const text = data?.choices?.[0]?.message?.content || "";

    if (!text) {
      console.error("Empty response from Groq:", JSON.stringify(data));
      return res.status(500).json({ content: [{ type: "text", text: JSON.stringify(data) }] });
    }

    res.json({ content: [{ type: "text", text }] });

  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/create-payment", async (req, res) => {
  try {
    const { title, price, email, level } = req.body;
    const accessToken = process.env.MP_ACCESS_TOKEN;

    const preference = {
      items: [{
        title: title,
        quantity: 1,
        currency_id: "ARS",
        unit_price: price
      }],
      payer: { email: email },
      back_urls: {
        success: `https://calistenia.australkungfu.com?payment=success&level=${level}&email=${encodeURIComponent(email)}`,
        failure: `https://calistenia.australkungfu.com?payment=failure`,
        pending: `https://calistenia.australkungfu.com?payment=pending`
      },
      auto_return: "approved",
      external_reference: `${email}-nivel${level}-${Date.now()}`
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();
    console.log("MP response:", JSON.stringify(data).substring(0, 300));

    if(data.init_point) {
      res.json({ init_point: data.init_point });
    } else {
      res.status(500).json({ error: "No se pudo crear la preferencia", detail: data });
    }
  } catch(err) {
    console.error("MP error:", err);
    res.status(500).json({ error: err.message });
  }
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log("Proxy corriendo en puerto " + PORT));
