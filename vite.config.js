import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/edu-traning/", // <--- 본인 저장소 이름 앞뒤로 슬래시 붙여서 추가
});
