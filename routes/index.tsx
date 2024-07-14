import { Handlers, PageProps } from "$fresh/server.ts"
import { Program } from "../shared/types.ts"
import { get_program } from "../shared/db.ts"
import Synth from "../islands/Synth.tsx"

export const handler: Handlers = {
   async GET (_req: any, ctx: any) {
      const program = await get_program ()
      return ctx.render (program)
   }
}

export default function SynthClient (props: PageProps<Program>) {
   return (
      <Synth enabled={ false } program={ props.data } />
   )
}
