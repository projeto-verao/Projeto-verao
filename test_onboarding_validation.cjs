const fs = require('fs');

async function testOnboardingValidation() {
  const photoBase64 = fs.readFileSync('/home/ubuntu/upload/search_images/zZoSSfC1kzb2.webp', { encoding: 'base64' });
  const API_KEY = process.env.VITE_GEMINI_API_KEY;
  const MODEL = "gemini-2.5-flash";
  const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

  const prompt = `Analise esta imagem. Ela deve ser uma foto de um ser humano em contexto de avaliação física (corpo inteiro ou parte do tronco/pernas visível para análise de composição corporal).
    
    Responda APENAS com JSON válido seguindo esta estrutura:
    {
      "isValid": true ou false,
      "reason": "se isValid for false, explique por que em português (ex: 'A foto é de um animal', 'A foto é de um objeto', 'A imagem está muito escura ou embaçada', 'Não é possível ver o corpo da pessoa adequadamente para avaliação')"
    }
    
    Regras:
    1. Retorne isValid: false se a imagem for de animais, objetos, paisagens ou se a pessoa estiver tão coberta ou distante que não dê para avaliar a forma física.
    2. Seja criterioso. Queremos evitar fotos que não sirvam para análise fitness.`;

  const body = {
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/webp", data: photoBase64 } }
      ]
    }],
    generationConfig: { responseMimeType: "application/json" }
  };

  try {
    const res = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

testOnboardingValidation();
