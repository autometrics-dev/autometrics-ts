/**
 * @autometrics
 */
function hi(world: string) {
	console.log(`Hello ${world}`);
	return `Hello ${world}`;
}

const hello: string = hi("are ya winnin' son")
console.log(hello)

export {}
