const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const LIBRARY = `
EMPUJE HORIZONTAL: Pushup Con Kettlebell, Pushup Con Inestabilidad, Empuje Con Banda Elástica, Flexiones abertura neutra, Flexiones abertura amplia, Flexiones con rodillas apoyadas, Flexiones inclinadas, Flexiones declinadas, Flexiones explosivas, Flexiones con aplauso, Flexiones Superman, Flexiones diamante, Flexiones espartanas, Flexiones hindúes, Flexiones Spiderman, Flexiones arqueras, Flexiones a una mano, Pseudo push ups, Flexiones con resistencia, Flexiones rusas, Empuje Con Banda De Suspension
EMPUJE VERTICAL: Pike push ups, Pike push ups con elevación, Flexiones de pino, Press Militar Con Banda Elastica
FONDOS: Fondos en paralelas, Fondos negativos en paralelas, Fondos con banda, Fondos explosivos en paralelas, Fondos en banco, Bar dips, Muscle up con salto
TRACCIÓN HORIZONTAL: Remo Unilateral Con Banda, Remo Con Banda Elástica, Remo en L, Australian pull ups prono, Remo invertido en barra, Australian pull ups supino
TRACCIÓN VERTICAL: Dominadas abertura neutra, Dominadas abertura amplia, Dominadas en supinación, Dominadas con salto, Dominadas negativas, Dominadas asistidas, Dominadas explosivas, High pull ups, Dominadas arqueras, Dominadas escapulares, Muscle up, Muscle up con asistencia
TREN INFERIOR RODILLA: Sentadilla, Sentadilla asistida, Sentadilla con apoyo en banco, Sentadilla con salto, Sentadilla búlgara, Pistol squat, Pistol squat en banco, Pistol squat asistida, Estocadas, Estocadas con desplazamiento, Estocadas con salto, Subida al banco a una pierna, Sentadilla isométrica, Gemelos con déficit
TREN INFERIOR CADERA: Hip thrust, Hip thrust a una pierna, Puente de glúteo, Puente de glúteo isométrico, Puente de glúteo a una pierna, Frog pump, Peso muerto con banda, Peso muerto a una pierna, Hiperextensión en banco, Patada de glúteo, Abduccion Con Banda Elastica
CORE: Burpees, Plancha Abdominal, Plancha con rodillas apoyadas, Plancha Dinámica Alternada, Plancha Con Extension De Brazo, Plancha Con Elevacion De Pierna, Deadbug, Hollow Plank, Caminata Abdominal, Rueda Abdominal, Crunch Abdominal, Crunch Cruzado, Escalador, Escalador Oblicuos, Rotación Con Banda, Pallof Press, Caminata del Granjero, Tijeras
QIGONG/KUNG FU (OBLIGATORIO 1 por día): Mabu, Zhan Zhuang, Ba Duan Jin 1-Dos Manos Sostienen el Cielo, Ba Duan Jin 2-Tensar el Arco, Ba Duan Jin 3-Separar Cielo y Tierra, Ba Duan Jin 4-Mirar hacia Atrás, Ba Duan Jin 5-Sacudir Cabeza y Cola, Ba Duan Jin 6-Tocar los Pies, Ba Duan Jin 7-Puños con Ojos Furiosos, Ba Duan Jin 8-Sacudir el Cuerpo, Gong Bu, Xing Bu
`;

app.post("/proxy", async (req, res) => {
  try {
    const originalMessage = req.body.messages?.[0]?.content || "";
    const atletaMatch = originalMessage.match(/DATOS DEL ATLETA:([\s\S]*?)EVALUACIÓN INICIAL:/);
    const evalMatch = originalMessage.match(/EVALUACIÓN INICIAL:([\s\S]*?)BIBLIOTECA DE EJERCICIOS:/);
    const datosAtleta = atletaMatch ? atletaMatch[1].trim() : "";
    const evaluacion = evalMatch ? evalMatch[1].trim() : "";

    const prompt = `Eres entrenador experto en calistenia de la academia Austral Kung Fu (artes marciales chinas y Tai Chi Chuan).

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy corriendo en puerto " + PORT));
