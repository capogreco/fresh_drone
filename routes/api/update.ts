import { Handlers } from "$fresh/server.ts";

const db = await Deno.openKv ()

export const handler: Handlers = {
   async POST (req) {
      const program = await req.json ()
      const { ok, versionstamp } = await db.set ([ `program` ], program)
      if (!ok) return new Response (`Failed to save program`, { status: 500 })
      program.versionstamp = versionstamp
      const bc = new BroadcastChannel (`program_channel`)
      await bc.postMessage ({ program, versionstamp })
      bc.close ()

      return Response.json (versionstamp)
   }

}