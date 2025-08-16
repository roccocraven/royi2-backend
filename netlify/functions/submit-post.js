exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);

    // 📝 Here you’d save the post data, commit to GitHub, etc.
    console.log("Received post:", data);

    return {
      statusCode: 200,
      body: "Post submitted successfully!"
    };
  } catch (error) {
    return { statusCode: 400, body: "Invalid request: " + error.message };
  }
};
