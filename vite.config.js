import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/edu-traning/",
  // 배포마다 바뀌는 값 — 교육 자료(JSON) 요청에 붙여 배포 직후에도 항상 최신 파일을 읽게 함
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
});
