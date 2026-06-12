const canvas = document.querySelector("#editorCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const state = {
  tool: "draw",
  drawing: false,
  start: null,
  snapshot: null,
  blurSource: null,
  sticker: "😊",
  history: [],
  originalDataUrl: null,
  activePointerId: null
};

const shapeTools = ["rect", "roundRect", "ellipse", "line", "arrow"];

const els = {
  imageInput: document.querySelector("#imageInput"),
  sampleButton: document.querySelector("#sampleButton"),
  resetButton: document.querySelector("#resetButton"),
  undoButton: document.querySelector("#undoButton"),
  downloadButton: document.querySelector("#downloadButton"),
  colorInput: document.querySelector("#colorInput"),
  fillColorInput: document.querySelector("#fillColorInput"),
  fillInput: document.querySelector("#fillInput"),
  sizeInput: document.querySelector("#sizeInput"),
  alphaInput: document.querySelector("#alphaInput"),
  blurInput: document.querySelector("#blurInput"),
  filenameInput: document.querySelector("#filenameInput"),
  formatInput: document.querySelector("#formatInput"),
  textInput: document.querySelector("#textInput"),
  imageMeta: document.querySelector("#imageMeta"),
  themeToggle: document.querySelector("#themeToggle")
};

function drawSample() {
  resizeCanvas(1280, 820);
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#d9f0ff");
  sky.addColorStop(.58, "#f7fbff");
  sky.addColorStop(1, "#e5efe8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#98b487";
  ctx.fillRect(0, 570, canvas.width, 250);
  ctx.fillStyle = "#d9c49e";
  ctx.fillRect(0, 640, canvas.width, 80);

  drawBuilding(80, 250, 250, 340, "#d86c59");
  drawBuilding(960, 220, 220, 370, "#6f91b6");

  drawPerson(450, 545, "#455a64", "#f2bd90");
  drawPerson(615, 555, "#356f5a", "#d49b78");
  drawPerson(790, 540, "#7d4a8d", "#e8b48b");

  ctx.fillStyle = "rgba(255,255,255,.82)";
  roundRect(56, 48, 420, 86, 12);
  ctx.fill();
  ctx.fillStyle = "#1d232d";
  ctx.font = "700 32px Pretendard, sans-serif";
  ctx.fillText("블러 테스트용 샘플", 86, 99);

  setOriginalFromCanvas();
  updateMeta("1280 x 820 @ sample");
}

function drawBuilding(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,255,255,.72)";
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      ctx.fillRect(x + 32 + col * 64, y + 34 + row * 68, 36, 42);
    }
  }
}

function drawPerson(x, y, clothes, skin) {
  ctx.fillStyle = clothes;
  roundRect(x - 38, y - 5, 76, 130, 28);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(x, y - 58, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b211f";
  ctx.beginPath();
  ctx.arc(x - 13, y - 66, 5, 0, Math.PI * 2);
  ctx.arc(x + 13, y - 66, 5, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function resizeCanvas(width, height) {
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
}

function updateMeta(text) {
  els.imageMeta.textContent = text;
}

function setOriginalFromCanvas() {
  const dataUrl = canvas.toDataURL("image/png");
  state.originalDataUrl = dataUrl;
  state.history = [dataUrl];
}

function pushHistory() {
  state.history.push(canvas.toDataURL("image/png"));
  if (state.history.length > 18) state.history.shift();
}

function restoreDataUrl(url, resetHistory = false) {
  const image = new Image();
  image.onload = () => {
    resizeCanvas(image.naturalWidth, image.naturalHeight);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    if (resetHistory) {
      state.history = [url];
    }
    updateMeta(`${canvas.width} x ${canvas.height}`);
  };
  image.src = url;
}

function resetToOriginal() {
  if (state.originalDataUrl) {
    restoreDataUrl(state.originalDataUrl, true);
  } else {
    drawSample();
  }
}

function loadFile(file) {
  if (!file) return;
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
    updateMeta("PNG, JPG, WEBP만 지원");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 2200;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      resizeCanvas(image.naturalWidth * scale, image.naturalHeight * scale);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      setOriginalFromCanvas();
      updateMeta(`${canvas.width} x ${canvas.height} @ ${file.name}`);
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function getStyle() {
  return {
    color: els.colorInput.value,
    fillColor: els.fillColorInput.value,
    fill: els.fillInput.value === "fill",
    size: Number(els.sizeInput.value),
    alpha: Number(els.alphaInput.value) / 100,
    blur: Number(els.blurInput.value)
  };
}

function saveSnapshot() {
  state.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function restoreSnapshot() {
  if (state.snapshot) ctx.putImageData(state.snapshot, 0, 0);
}

function prepareBlurSource() {
  const { blur } = getStyle();
  const source = document.createElement("canvas");
  source.width = canvas.width;
  source.height = canvas.height;
  const sourceCtx = source.getContext("2d");
  sourceCtx.filter = `blur(${blur}px)`;
  sourceCtx.drawImage(canvas, 0, 0);
  state.blurSource = source;
}

function beginDraw(event) {
  event.preventDefault();
  if (state.activePointerId !== null) return;
  const point = pointFromEvent(event);
  state.drawing = true;
  state.start = point;
  state.activePointerId = event.pointerId;
  canvas.setPointerCapture(event.pointerId);

  if (["draw", "blur", ...shapeTools].includes(state.tool)) {
    saveSnapshot();
  }

  if (state.tool === "blur") {
    prepareBlurSource();
    paintBlur(point);
  }
  if (state.tool === "draw") {
    const { color, size, alpha } = getStyle();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x + 0.01, point.y + 0.01);
    ctx.stroke();
  }

  if (state.tool === "sticker") {
    drawSticker(point);
    pushHistory();
    state.drawing = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    state.activePointerId = null;
  }

  if (state.tool === "text") {
    drawText(point);
    pushHistory();
    state.drawing = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    state.activePointerId = null;
  }
}

function moveDraw(event) {
  if (!state.drawing) return;
  if (event.pointerId !== state.activePointerId) return;
  event.preventDefault();
  const point = pointFromEvent(event);

  if (state.tool === "draw") {
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    return;
  }

  if (state.tool === "blur") {
    paintBlur(point);
    return;
  }

  if (shapeTools.includes(state.tool)) {
    restoreSnapshot();
    drawShapePreview(state.start, point);
  }
}

function endDraw(event) {
  if (!state.drawing) return;
  if (event.pointerId !== state.activePointerId) return;
  event.preventDefault();

  if (shapeTools.includes(state.tool)) {
    const point = pointFromEvent(event);
    restoreSnapshot();
    drawShapePreview(state.start, point);
  }

  ctx.globalAlpha = 1;
  state.drawing = false;
  state.snapshot = null;
  state.blurSource = null;
  state.activePointerId = null;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  pushHistory();
}

function paintBlur(point) {
  if (!state.blurSource) return;
  const { size, alpha } = getStyle();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(state.blurSource, 0, 0);
  ctx.restore();
}

function drawShapePreview(start, end) {
  const { color, fillColor, fill, size, alpha } = getStyle();
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (state.tool === "rect") {
    if (fill) ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  }

  if (state.tool === "roundRect") {
    roundRect(x, y, w, h, Math.min(36, Math.max(10, size * 1.4)));
    if (fill) ctx.fill();
    ctx.stroke();
  }

  if (state.tool === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
    if (fill) ctx.fill();
    ctx.stroke();
  }

  if (state.tool === "line") {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  if (state.tool === "arrow") drawArrow(start, end, size, color);
  ctx.globalAlpha = 1;
}

function drawArrow(start, end, size, color) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const head = Math.max(18, size * 2.2);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawSticker(point) {
  const { size, alpha } = getStyle();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${Math.max(28, size * 2.2)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.sticker, point.x, point.y);
  ctx.restore();
}

function drawText(point) {
  const { color, size, alpha } = getStyle();
  const text = els.textInput.value.trim() || "텍스트";
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${Math.max(22, size * 1.5)}px Pretendard, "Noto Sans KR", sans-serif`;
  ctx.lineWidth = Math.max(4, size / 4);
  ctx.strokeStyle = "rgba(0,0,0,.55)";
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.strokeText(text, point.x, point.y);
  ctx.fillText(text, point.x, point.y);
  ctx.restore();
}

function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll(".tool").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
}

function downloadImage() {
  const mime = els.formatInput.value;
  const ext = mime.split("/")[1].replace("jpeg", "jpg");
  const filename = `${els.filenameInput.value.trim() || "blog-image-edited"}.${ext}`;
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = canvas.width;
  outputCanvas.height = canvas.height;
  const outputCtx = outputCanvas.getContext("2d");
  if (mime === "image/jpeg") {
    outputCtx.fillStyle = "#ffffff";
    outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  }
  outputCtx.drawImage(canvas, 0, 0);
  const link = document.createElement("a");
  link.download = filename;
  link.href = outputCanvas.toDataURL(mime, .92);
  link.click();
}

document.querySelectorAll(".tool").forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

document.querySelectorAll(".sticker").forEach((button) => {
  button.addEventListener("click", () => {
    state.sticker = button.dataset.sticker;
    document.querySelectorAll(".sticker").forEach((item) => item.classList.toggle("active", item === button));
    setTool("sticker");
  });
});

els.imageInput.addEventListener("change", (event) => loadFile(event.target.files[0]));
els.sampleButton.addEventListener("click", drawSample);
els.resetButton.addEventListener("click", resetToOriginal);
els.undoButton.addEventListener("click", () => {
  if (state.history.length <= 1) return;
  state.history.pop();
  restoreDataUrl(state.history[state.history.length - 1]);
});
els.downloadButton.addEventListener("click", downloadImage);
els.themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  els.themeToggle.textContent = document.body.classList.contains("light") ? "다크" : "라이트";
});

canvas.addEventListener("pointerdown", beginDraw);
canvas.addEventListener("pointermove", moveDraw);
canvas.addEventListener("pointerup", endDraw);
canvas.addEventListener("pointercancel", endDraw);

drawSample();
