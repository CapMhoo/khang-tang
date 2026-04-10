export async function askChatbot(question: string, role: string) {

  const response = await fetch("http://192.168.1.102:8000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: question,
      role: role
    }),
  });

  const data = await response.json();

  return data.answer;
}