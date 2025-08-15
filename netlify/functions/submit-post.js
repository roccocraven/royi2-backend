const { Octokit } = require("@octokit/rest");

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

exports.handler = async function(event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ message: "Method Not Allowed" }) };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ message: "Invalid JSON", error: e.message }) };
  }

  const title = (payload.title || "").trim();
  const body  = (payload.body  || "").trim();

  if (!title || !body) {
    return { statusCode: 400, headers, body: JSON.stringify({ message: "Missing title or body" }) };
  }

  // Robust slug: keep a-z0-9, collapse spaces/punct to -, trim dashes
  const slug = title.toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const dateISO = new Date().toISOString();
  const dateDay = dateISO.split("T")[0];

  const filename = `${dateDay}-${slug}.md`;
  const filepath = `_posts/${filename}`;

  const content = `---
layout: post
title: "${title.replace(/"/g, '\\"')}"
date: ${dateISO}
categories: [guest]
---
${body}
`;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, headers, body: JSON.stringify({ message: "Missing GITHUB_TOKEN env var" }) };
  }

  const octokit = new Octokit({ auth: token });

  try {
    // Check for duplicate
    try {
      await octokit.repos.getContent({ owner: "roccocraven", repo: "royi2", path: filepath });
      return { statusCode: 409, headers, body: JSON.stringify({ message: "Post already exists", filepath }) };
    } catch (e) {
      // 404 means good to create
      if (e.status && e.status !== 404) throw e;
    }

    // Create file on main
    await octokit.repos.createOrUpdateFileContents({
      owner: "roccocraven",
      repo: "royi2",
      path: filepath,
      message: `Add guest post: ${title}`,
      content: Buffer.from(content).toString("base64"),
      branch: "main"
    });

    return { statusCode: 200, headers, body: JSON.stringify({ message: "Post submitted successfully!", filepath }) };
  } catch (error) {
    // Return useful details for debugging
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Error submitting post", error: error.message || String(error) })
    };
  }
};
