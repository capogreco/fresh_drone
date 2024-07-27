const db = await Deno.openKv()

export async function get_program () {
   const { value, versionstamp } = await db.get ([ `program` ])
   // value.versionstamp = versionstamp
   const type = `update`
   return { ...value, type, versionstamp}
}