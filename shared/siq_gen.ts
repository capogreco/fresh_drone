// small integer quotient array generator

export function siq_gen (num: number, den: number, unity: number) {
   const num_min = Math.floor (unity * num) + 1 // [1, 12]
   const num_array = []
   for (let i = num_min; i <= num; i++) num_array.push (i)

   const den_min = Math.floor (unity * den) + 1
   const den_array = []
   for (let i = den_min; i <= den; i++) den_array.push (i)   // console.log (den_min, den_array)

   return [ num_array, den_array ]
}