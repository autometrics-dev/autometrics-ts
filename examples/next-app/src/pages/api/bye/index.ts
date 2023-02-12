// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { autometrics } from "autometrics";
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
	name: string;
};

function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
	res.status(200).json({ name: "Jane Dawson" });
}

export default autometrics(handler);
