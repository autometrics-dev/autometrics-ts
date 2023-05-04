import { Transformer } from "@parcel/plugin";
import { addAutometricsOptions } from "./lib";

export default new Transformer({
  async transform({ asset }) {
    const { filePath } = asset;
    const code = await asset.getCode();

    if (/\.(js|ts)x?$/.test(filePath) && code.includes("autometrics(")) {
      const transformedCode = addAutometricsOptions(code, filePath);
      asset.setCode(transformedCode);
    }

    return [asset];
  },
});
