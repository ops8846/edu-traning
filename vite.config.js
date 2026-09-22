import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 배포 시 base를 "/저장소이름/"으로 바꿔주세요.
// 예: 저장소 주소가 https://github.com/mycompany/safety-training 이면
//     base: "/safety-training/"
// 자체 도메인(커스텀 도메인)을 쓸 경우에는 base: "/" 그대로 두면 됩니다.
export default defineConfig({
  plugins: [react()],
  base: "/",
});
