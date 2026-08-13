// netlify/functions/blog-posts.js
//
// Fetches the 3 most recent PUBLISHED posts from the Verve Collective HubSpot blog
// and returns them in a clean, simple shape for the homepage to consume.
//
// Requires HUBSPOT_API_TOKEN set as a Netlify environment variable
// (Site configuration -> Environment variables), pointing at a HubSpot
// Private App token with blog-post read access.

const BLOG_ID = "219323219858"; // Verve Collective Blog — confirmed via HubSpot

function stripHtml(html) {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(html, maxLen = 140) {
  const text = stripHtml(html);
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async (req, context) => {
  const token = process.env.HUBSPOT_API_TOKEN;

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (!token) {
    return new Response(
      JSON.stringify({ error: "HUBSPOT_API_TOKEN not configured" }),
      { status: 500, headers: cors }
    );
  }

  try {
    const url = `https://api.hubapi.com/cms/v3/blogs/posts?contentGroupId=${BLOG_ID}&state=PUBLISHED&sort=-publishDate&limit=3`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: "HubSpot API error", status: res.status, detail: errText }),
        { status: 502, headers: cors }
      );
    }

    const data = await res.json();
    const results = (data.results || []).map((post) => ({
      title: post.name || post.htmlTitle || "Untitled",
      excerpt: excerpt(post.postSummary || post.postBody),
      date: formatDate(post.publishDate),
      url: post.url || post.absoluteUrl || `https://www.blog.weareverveco.com/${post.slug}`,
    }));

    return new Response(JSON.stringify({ posts: results }), {
      status: 200,
      headers: cors,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", detail: String(err) }),
      { status: 500, headers: cors }
    );
  }
};

export const config = { path: "/api/blog-posts" };
