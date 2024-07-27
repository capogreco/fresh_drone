import { Handlers } from "$fresh/server.ts";

const db = await Deno.openKv ()

export const handler: Handlers = {
   async POST (req) {
      const program = await req.json ()

      const handle: any = {
         async save () {
            const { ok } = await db.set ([ `bank`, program.key ], program)
            if (!ok) return new Response (`Failed to save program`, { status: 500 })
            const bc = new BroadcastChannel (`program_channel`)
            await bc.postMessage ({ type: `save`, key: program.key })
            bc.close ()
         },
         async load () {
            const old_program = await db.get ([ `bank`, program.key ])
            if (!old_program) return new Response (`Failed to load program`, { status: 500 })
            const bc = new BroadcastChannel (`program_channel`)
            await bc.postMessage ({ type: `load`, key: program.key, program, old_program })
            bc.close ()
         }
      }

      handle[program.type] ()

      // if (program.save_mode) {
      //    const { ok } = await db.set ([ `bank`, program.key ], program)
      //    if (!ok) return new Response (`Failed to save program`, { status: 500 })
      //    const bc = new BroadcastChannel (`program_channel`)
      //    await bc.postMessage ({ type: `save`, key: program.key })
      //    bc.close ()
      // }
      // else {
      //    const new_program = await db.get ([ `bank`, program.key ])
      //    if (!new_program) return new Response (`Failed to load program`, { status: 500 })
      //    const bc = new BroadcastChannel (`program_channel`)
      //    await bc.postMessage ({ type: `load`, key: program.key, program: new_program })
      //    bc.close ()
      // }

      // return Response.json (versionstamp)
      return Response.json (`test`)
   }
}
