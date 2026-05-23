/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    // Windows + Next.js dev 의 .next/cache/webpack 파일 잠금 충돌을 회피.
    // 디스크 캐시를 끄고 메모리 캐시만 사용 — dev 핫 리로드는 정상,
    // 다만 dev 서버 첫 시작이 약간 느려질 수 있음.
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
