import { Config } from "@remotion/cli/config";

// En la nube no hay GPU: "angle" usa SwiftShader (software) dentro de Chromium.
Config.setChromiumOpenGlRenderer("angle");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");
