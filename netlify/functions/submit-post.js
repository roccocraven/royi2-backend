const { Octokit } = require("@octokit/rest");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { title, body } = JSON.parse(event.body || "{}");
  if (!title || !body) {
    return { statusCode: 400, body: "Missing title or body" };
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const date = new Date().toISOString().split("T")[0];
  const filename = `${date}-${slug}.md`;
  const filepath = `_posts/${filename}`;

  const content = `---
layout: post
title: "${title}"
date: ${new Date().toISOString()}
categories: [guest]
---

${body}
`;

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  try {
    const { data: repo } = await octokit.repos.get({
      owner: "roccocraven",
      repo: "royi2"
    });

    const { data: latestCommit } = await octokit.repos.getContent({
      owner: "roccocraven",
      repo: "royi2",
      path: filepath
    }).catch(() => ({ data: null }));

    if (latestCommit) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: "Post already exists" })
      };
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: "roccocraven",
      repo: "royi2",
      path: filepath,
      message: `Add guest post: ${title}`,
      content: Buffer.from(content).toString("base64"),
      branch: "main"
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Post submitted successfully!" })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error submitting post", error: error.message })
    };
  }
};
