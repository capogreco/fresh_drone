import { Handlers } from "$fresh/server.ts"
import { get_program } from "../../shared/db.ts"

export const handler: Handlers = {
   GET () {
      const bc = new BroadcastChannel (`program_channel`)
      let timer_id: number | undefined

      const body = new ReadableStream ({
         async start (controller) {
            controller.enqueue (`retry: 1000\n\n`)

            bc.onmessage = e => {
               // console.log(e)

               const handle: { [key: string]: () => void } = {
                  update () {
                     const { program } = e.data
                     program.type = `update`
                     controller.enqueue (`data: ${ JSON.stringify (program) }\n\n`)
                  },
                  load () {
                     // console.log (`load`, e.data)
                     controller.enqueue (`data: ${ JSON.stringify (e.data) }\n\n`)
                  },
                  save () {
                     // console.log (`save`, e.data)
                     controller.enqueue (`data: ${ JSON.stringify (e.data) }\n\n`)
                  }
               }

               handle[e.data.type] ()

               // const { program } = e.data
               // console.log (program)
               // controller.enqueue (`data: ${ JSON.stringify (program) }\n\n`)
            }

            async function queue_update () {
               timer_id = undefined
               try {
                  const program = await get_program ()
                  controller.enqueue (`data: ${ JSON.stringify (program) }\n\n`)   
               }
               
               finally {
                  // timer_id = setTimeout (queue_update, 10000)
               }
            }
            await queue_update ()
         },

         cancel () {
            bc.close ()
            if (typeof timer_id === `number`) clearTimeout (timer_id)
         }
      })

      return new Response (body.pipeThrough (new TextEncoderStream ()), {
         headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
         }
      })
   }
}