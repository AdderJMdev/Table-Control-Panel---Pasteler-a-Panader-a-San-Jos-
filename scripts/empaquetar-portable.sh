#!/usr/bin/env bash
###############################################################################
# Empaqueta "SanJose-Portable" para Windows 10/11 desde Linux (o macOS/WSL).
#
#   Genera:  dist/SanJose-Portable/  y  dist/SanJose-Portable.zip
#
# Pasos:
#   1. Descarga el runtime oficial de Node.js para Windows (node.exe).
#   2. Instala las dependencias con el binario NATIVO de Windows
#      (npm_config_platform=win32) -> better_sqlite3.node debe ser PE32+.
#   3. Copia la aplicacion (src, public, scripts) y los scripts portable.
#   4. Verifica que la version de Node descargada y el binario nativo
#      comparten el MISMO ABI (de lo contrario el exe no cargara el modulo).
#   5. Comprime todo en un .zip listo para distribuir.
#
# Requiere: node, npm, curl y python3 (para el zip).
###############################################################################
set -euo pipefail

# Version de Node para Windows. OJO: debe coincidir el ABI con el que usa la
# maquina de build para instalar better-sqlite3 (el script lo comprueba solo).
NODE_VERSION="${NODE_VERSION:-v22.22.1}"
NODE_FULL="node-${NODE_VERSION}-win-x64"
NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_FULL}.zip"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT}/dist"
OUT_DIR="${DIST_DIR}/SanJose-Portable"
ZIP_OUT="${DIST_DIR}/SanJose-Portable.zip"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

say()  { printf '\033[1;34m[build]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; exit 1; }

[ -x "$(command -v node)" ]        || die "se requiere node"
[ -x "$(command -v npm)" ]         || die "se requiere npm"
[ -x "$(command -v curl)" ]        || die "se requiere curl"
[ -x "$(command -v python3)" ]     || die "se requiere python3"

# ---------------------------------------------------------------------------
say "1/6 Descargando Node.js ${NODE_VERSION} para Windows ..."
curl -fsSL -o "${TMP}/${NODE_FULL}.zip" "${NODE_URL}" \
  || die "no se pudo descargar ${NODE_URL}"
python3 -m zipfile -e "${TMP}/${NODE_FULL}.zip" "${TMP}/node" || die "no se pudo extraer Node"

# ---------------------------------------------------------------------------
say "2/6 Instalando dependencias con binarios nativos de Windows ..."
mkdir -p "${TMP}/deps"
cp "${ROOT}/package.json" "${ROOT}/package-lock.json" "${TMP}/deps/"
(
  cd "${TMP}/deps"
  npm_config_platform=win32 npm_config_arch=x64 \
    npm ci --no-audit --no-fund --loglevel=error
) || die "fallo npm ci (cross-install win32)"

# ---------------------------------------------------------------------------
say "3/6 Verificando coincidencia de ABI (binario nativo vs Node Windows) ..."
NATIVE_NODE_DIR="${TMP}/deps/node_modules/better-sqlite3/build/Release"
[ -f "${NATIVE_NODE_DIR}/better_sqlite3.node" ] \
  || die "no se encontro better_sqlite3.node (prebuild descargado?)"

ABI_LABEL="$(node -p "process.versions.modules")"
if [ -d "${TMP}/deps/node_modules/node-abi" ]; then
  ABI_EXPECTED="$(cd "${TMP}/deps" && node -p "require('node-abi').getAbi('${NODE_VERSION#v}', 'node')")"
else
  ABI_EXPECTED="${ABI_LABEL}"   # sin node-abi disponible: asumir coincidencia
fi
if [ "$ABI_EXPECTED" != "$ABI_LABEL" ]; then
  die "El ABI del build (${ABI_LABEL}) no coincide con el de ${NODE_VERSION} (${ABI_EXPECTED}). Usa Node ${NODE_VERSION#v}.x para buildear, o ajusta NODE_VERSION."
fi
say "    ABI ${ABI_LABEL} OK (coincide con Node ${NODE_VERSION})"

# ---------------------------------------------------------------------------
say "4/6 Ensamblando la carpeta portable ..."
rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"
cp "${TMP}/node/${NODE_FULL}/node.exe" "${OUT_DIR}/node.exe"
cp -r "${TMP}/deps/node_modules"       "${OUT_DIR}/node_modules"
cp -r "${ROOT}/src"                    "${OUT_DIR}/src"
cp -r "${ROOT}/public"                 "${OUT_DIR}/public"
cp    "${ROOT}/package.json"           "${OUT_DIR}/package.json"
cp    "${ROOT}/README.md"              "${OUT_DIR}/README.md"
cp    "${ROOT}/portable/config.local.json"      "${OUT_DIR}/config.local.json"
cp    "${ROOT}/portable/Instalar-SanJose.bat"   "${OUT_DIR}/Instalar-SanJose.bat"
cp    "${ROOT}/portable/Desinstalar-SanJose.bat" "${OUT_DIR}/Desinstalar-SanJose.bat"
cp    "${ROOT}/portable/iniciar-servidor.vbs"   "${OUT_DIR}/iniciar-servidor.vbs"
cp    "${ROOT}/portable/README-WINDOWS.txt"     "${OUT_DIR}/README-WINDOWS.txt"

# ---------------------------------------------------------------------------
say "5/6 Verificaciones finales ..."
NATIVE_BIN="${OUT_DIR}/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
file "${NATIVE_BIN}" | grep -qi "PE32" \
  || die "¡el binario nativo NO es de Windows! revisa el paso de cross-install"
say "    better_sqlite3.node es PE32+ (Windows x64) ✔"
[ -s "${OUT_DIR}/node.exe" ] || die "node.exe no encontrado o vacio"
SIZE_MB="$(du -sm "${OUT_DIR}" | cut -f1)"
say "    Carpeta portable: ${SIZE_MB} MB"

# ---------------------------------------------------------------------------
say "6/6 Comprimiendo ..."
rm -f "${ZIP_OUT}"
(cd "${DIST_DIR}" && python3 -m zipfile -c "${ZIP_OUT}" "SanJose-Portable")
ZIP_MB="$(du -m "${ZIP_OUT}" | cut -f1)"

echo
echo "================================================================"
echo "  LISTO ✔"
echo "    Carpeta : ${OUT_DIR}  (${SIZE_MB} MB)"
echo "    Zip     : ${ZIP_OUT}  (${ZIP_MB} MB)"
echo "  En Windows: descomprimir y ejecutar Instalar-SanJose.bat"
echo "================================================================"