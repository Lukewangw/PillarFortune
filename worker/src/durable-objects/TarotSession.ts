export class TarotSession {
  state: DurableObjectState;
  env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/initialize") {
      const body = await request.json<any>();
      await this.state.storage.put("context", body.context);
      await this.state.storage.put("history", body.history || []);
      return Response.json({ ok: true });
    }

    if (request.method === "POST" && url.pathname === "/message") {
      const body = await request.json<any>();
      const history = ((await this.state.storage.get<any[]>("history")) || []).slice(-10);
      history.push({ role: "user", content: body.message });
      history.push({ role: "assistant", content: body.reply });
      await this.state.storage.put("history", history.slice(-12));
      if (body.summary) {
        await this.state.storage.put("summary", body.summary);
      }
      return Response.json({ history: history.slice(-12) });
    }

    if (request.method === "GET" && url.pathname === "/state") {
      const [context, history, summary] = await Promise.all([
        this.state.storage.get("context"),
        this.state.storage.get("history"),
        this.state.storage.get("summary"),
      ]);
      return Response.json({ context, history: history || [], summary: summary || "" });
    }

    return new Response("Not found", { status: 404 });
  }
}
