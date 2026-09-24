# Photo conversion worker (isolated)
FROM node:22-alpine

WORKDIR /app

# perl + libc6-compat: exiftool-vendored. poppler-utils: pdftoppm, used to
# rasterise the resume PDF into page images. libheif-tools: heif-dec, with the
# libde265 HEVC decoder that sharp's prebuilt binaries lack (iPhone HEICs).
# libraw-tools: dcraw_emu, for RAWs without a usable embedded preview.
RUN apk add --no-cache perl libc6-compat poppler-utils libheif-tools libraw-tools

COPY package*.json ./
RUN npm install

COPY worker.js derivatives.js resume.js ./

RUN mkdir -p /app/uploads && chown -R node:node /app

USER node
CMD ["node", "worker.js"]
