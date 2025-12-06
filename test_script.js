const apiKey = "";
async function runOpenAI(message) {

  let tic = new Date();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-5-nano",      // or any other supported chat model
      instructions: "You are an auto-complete bot that completes text, only return the completion text, nothing else.",
      input: message,
      reasoning: {effort: "minimal"}
    })
  });

  const data = await response.json();
  console.log(new Date() - tic)
  console.log(data);
  console.log(data.output[1].content[0].text)
}

runOpenAI("Hello, there! Ahhh, gener")