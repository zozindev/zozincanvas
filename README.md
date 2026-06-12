# zozincanvas

블로그 업로드용 이미지에 펜, 블러, 도형, 화살표, 스티커, 텍스트를 적용하는 no-build 정적 웹사이트입니다.

이미지는 브라우저 안에서만 처리되며 서버로 업로드되지 않습니다.

## 기능

- PNG, JPG, WEBP 업로드
- 펜, 블러 브러시, 사각형, 둥근네모, 원, 선, 화살표
- 스티커와 짧은 텍스트 삽입
- 되돌리기, 원본 초기화
- PNG, JPG, WEBP 다운로드
- 모바일 터치 편집 지원

## Cloudflare Pages 배포

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Cloudflare Pages에서 해당 저장소를 연결합니다.
3. Build command는 비워둡니다.
4. Build output directory는 `/` 또는 저장소 루트 기준 사이트 폴더로 지정합니다.

서버 API, DB, 환경변수 없이 브라우저에서만 동작합니다.
