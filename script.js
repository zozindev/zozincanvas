const canvas = document.querySelector("#editorCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const baseCanvas = document.createElement("canvas");
const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true });

const shapeTools = ["rect", "roundRect", "ellipse", "line", "arrow"];
const objectTools = ["text", "sticker", ...shapeTools];
const handleSize = 14;

const state = {
  tool: "draw",
  drawing: false,
  start: null,
  snapshot: null,
  blurSource: null,
  sticker: "😊",
  history: [],
  originalState: null,
  activePointerId: null,
  editingTextId: null,
  pickingColor: false,
  objects: [],
  selectedId: null,
  draftObject: null,
  dragMode: null,
  dragStartObject: null,
  nextObjectId: 1
};

const els = {
  imageInput: document.querySelector("#imageInput"),
  uploadDropZone: document.querySelector("#uploadDropZone"),
  canvasDropZone: document.querySelector("#canvasDropZone"),
  sampleButton: document.querySelector("#sampleButton"),
  resetButton: document.querySelector("#resetButton"),
  undoButton: document.querySelector("#undoButton"),
  downloadButton: document.querySelector("#downloadButton"),
  colorInput: document.querySelector("#colorInput"),
  hexInput: document.querySelector("#hexInput"),
  eyedropperButton: document.querySelector("#eyedropperButton"),
  fillColorInput: document.querySelector("#fillColorInput"),
  fillInput: document.querySelector("#fillInput"),
  sizeInput: document.querySelector("#sizeInput"),
  alphaInput: document.querySelector("#alphaInput"),
  blurInput: document.querySelector("#blurInput"),
  filenameInput: document.querySelector("#filenameInput"),
  formatInput: document.querySelector("#formatInput"),
  textEditor: document.querySelector("#textEditor"),
  fontInput: document.querySelector("#fontInput"),
  textAlignInput: document.querySelector("#textAlignInput"),
  textVAlignInput: document.querySelector("#textVAlignInput"),
  boldToggle: document.querySelector("#boldToggle"),
  italicToggle: document.querySelector("#italicToggle"),
  underlineToggle: document.querySelector("#underlineToggle"),
  strikeToggle: document.querySelector("#strikeToggle"),
  imageMeta: document.querySelector("#imageMeta"),
  themeToggle: document.querySelector("#themeToggle")
};

function resizeCanvas(width, height) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  canvas.width = safeWidth;
  canvas.height = safeHeight;
  baseCanvas.width = safeWidth;
  baseCanvas.height = safeHeight;
}

function updateMeta(text) {
  els.imageMeta.textContent = text;
}

function drawSample() {
  resizeCanvas(1280, 820);
  const sky = baseCtx.createLinearGradient(0, 0, 0, baseCanvas.height);
  sky.addColorStop(0, "#d9f0ff");
  sky.addColorStop(.58, "#f7fbff");
  sky.addColorStop(1, "#e5efe8");
  baseCtx.fillStyle = sky;
  baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);

  baseCtx.fillStyle = "#98b487";
  baseCtx.fillRect(0, 570, baseCanvas.width, 250);
  baseCtx.fillStyle = "#d9c49e";
  baseCtx.fillRect(0, 640, baseCanvas.width, 80);

  drawBuilding(80, 250, 250, 340, "#d86c59");
  drawBuilding(960, 220, 220, 370, "#6f91b6");

  drawPerson(450, 545, "#455a64", "#f2bd90");
  drawPerson(615, 555, "#356f5a", "#d49b78");
  drawPerson(790, 540, "#7d4a8d", "#e8b48b");

  baseCtx.fillStyle = "rgba(255,255,255,.82)";
  roundRect(baseCtx, 56, 48, 420, 86, 12);
  baseCtx.fill();
  baseCtx.fillStyle = "#1d232d";
  baseCtx.font = "700 32px Pretendard, sans-serif";
  baseCtx.fillText("블러 테스트용 샘플", 86, 99);

  state.objects = [];
  state.selectedId = null;
  state.draftObject = null;
  setOriginalFromCurrent();
  render();
  updateMeta("1280 x 820 @ sample");
}

function drawBuilding(x, y, w, h, color) {
  baseCtx.fillStyle = color;
  baseCtx.fillRect(x, y, w, h);
  baseCtx.fillStyle = "rgba(255,255,255,.72)";
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      baseCtx.fillRect(x + 32 + col * 64, y + 34 + row * 68, 36, 42);
    }
  }
}

function drawPerson(x, y, clothes, skin) {
  baseCtx.fillStyle = clothes;
  roundRect(baseCtx, x - 38, y - 5, 76, 130, 28);
  baseCtx.fill();
  baseCtx.fillStyle = skin;
  baseCtx.beginPath();
  baseCtx.arc(x, y - 58, 42, 0, Math.PI * 2);
  baseCtx.fill();
  baseCtx.fillStyle = "#2b211f";
  baseCtx.beginPath();
  baseCtx.arc(x - 13, y - 66, 5, 0, Math.PI * 2);
  baseCtx.arc(x + 13, y - 66, 5, 0, Math.PI * 2);
  baseCtx.fill();
}

function roundRect(targetCtx, x, y, w, h, r) {
  const radius = Math.min(Math.abs(w) / 2, Math.abs(h) / 2, r);
  targetCtx.beginPath();
  targetCtx.moveTo(x + radius, y);
  targetCtx.arcTo(x + w, y, x + w, y + h, radius);
  targetCtx.arcTo(x + w, y + h, x, y + h, radius);
  targetCtx.arcTo(x, y + h, x, y, radius);
  targetCtx.arcTo(x, y, x + w, y, radius);
  targetCtx.closePath();
}

function snapshotState() {
  return {
    base: baseCanvas.toDataURL("image/png"),
    objects: structuredClone(state.objects),
    selectedId: state.selectedId,
    nextObjectId: state.nextObjectId
  };
}

function setOriginalFromCurrent() {
  state.originalState = snapshotState();
  state.history = [snapshotState()];
}

function pushHistory() {
  state.history.push(snapshotState());
  if (state.history.length > 18) state.history.shift();
}

function restoreState(snapshot, resetHistory = false) {
  const image = new Image();
  image.onload = () => {
    resizeCanvas(image.naturalWidth, image.naturalHeight);
    baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
    baseCtx.drawImage(image, 0, 0);
    state.objects = structuredClone(snapshot.objects || []);
    state.selectedId = snapshot.selectedId || null;
    state.nextObjectId = snapshot.nextObjectId || nextObjectIdFromObjects();
    if (resetHistory) state.history = [snapshotState()];
    render();
    updateSelectionControls();
    updateMeta(`${canvas.width} x ${canvas.height}`);
  };
  image.src = snapshot.base;
}

function nextObjectIdFromObjects() {
  return state.objects.reduce((max, object) => Math.max(max, object.id + 1), 1);
}

function resetToOriginal() {
  if (state.originalState) {
    restoreState(state.originalState, true);
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
      baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
      baseCtx.drawImage(image, 0, 0, baseCanvas.width, baseCanvas.height);
      state.objects = [];
      state.selectedId = null;
      state.draftObject = null;
      setOriginalFromCurrent();
      render();
      updateMeta(`${canvas.width} x ${canvas.height} @ ${file.name}`);
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function getDroppedImage(event) {
  return Array.from(event.dataTransfer?.files || []).find((file) => /^image\/(png|jpe?g|webp)$/i.test(file.type));
}

function handleImageDrag(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drag-active");
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
}

function clearImageDrag(event) {
  event.currentTarget.classList.remove("drag-active");
}

function clearImageDragState() {
  els.uploadDropZone.classList.remove("drag-active");
  els.canvasDropZone.classList.remove("drag-active");
}

function handleImageDrop(event) {
  event.preventDefault();
  clearImageDragState();
  const file = getDroppedImage(event);
  if (file) {
    loadFile(file);
  } else {
    updateMeta("PNG, JPG, WEBP만 드롭 가능");
  }
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
    blur: Number(els.blurInput.value),
    bold: els.boldToggle.classList.contains("active"),
    italic: els.italicToggle.classList.contains("active"),
    underline: els.underlineToggle.classList.contains("active"),
    strike: els.strikeToggle.classList.contains("active"),
    font: els.fontInput.value,
    align: els.textAlignInput.value,
    vAlign: els.textVAlignInput.value
  };
}

function render(showSelection = true) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(baseCanvas, 0, 0);
  state.objects.forEach((object) => drawObject(ctx, object));
  if (state.draftObject) drawObject(ctx, state.draftObject);
  const selected = getSelectedObject();
  if (showSelection && selected) drawSelection(selected);
}

function canvasDisplayScale() {
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.width / canvas.width,
    y: rect.height / canvas.height
  };
}

function saveSnapshot() {
  state.snapshot = baseCtx.getImageData(0, 0, baseCanvas.width, baseCanvas.height);
}

function restoreSnapshot() {
  if (state.snapshot) baseCtx.putImageData(state.snapshot, 0, 0);
}

function prepareBlurSource() {
  const { blur } = getStyle();
  const source = document.createElement("canvas");
  source.width = baseCanvas.width;
  source.height = baseCanvas.height;
  const sourceCtx = source.getContext("2d");
  sourceCtx.filter = `blur(${blur}px)`;
  sourceCtx.drawImage(baseCanvas, 0, 0);
  state.blurSource = source;
}

function beginDraw(event) {
  event.preventDefault();
  if (state.pickingColor) {
    pickColorFromCanvas(pointFromEvent(event));
    return;
  }
  if (state.activePointerId !== null) return;
  const point = pointFromEvent(event);
  const hit = hitTest(point);

  state.drawing = true;
  state.start = point;
  state.activePointerId = event.pointerId;
  canvas.setPointerCapture(event.pointerId);

  if (hit && (state.tool === "select" || objectTools.includes(state.tool))) {
    selectObject(hit.object.id);
    state.dragMode = hit.handle ? "resize" : "move";
    state.dragStartObject = structuredClone(hit.object);
    return;
  }

  if (state.tool === "select") {
    selectObject(null);
    state.drawing = false;
    releasePointer(event.pointerId);
    return;
  }

  selectObject(null);

  if (state.tool === "draw" || state.tool === "blur") {
    saveSnapshot();
  }

  if (state.tool === "blur") {
    prepareBlurSource();
    paintBlur(point);
    render();
  }

  if (state.tool === "draw") {
    const { color, size, alpha } = getStyle();
    baseCtx.globalAlpha = alpha;
    baseCtx.strokeStyle = color;
    baseCtx.lineWidth = size;
    baseCtx.lineCap = "round";
    baseCtx.lineJoin = "round";
    baseCtx.beginPath();
    baseCtx.moveTo(point.x, point.y);
    baseCtx.lineTo(point.x + 0.01, point.y + 0.01);
    baseCtx.stroke();
    render();
  }

  if (state.tool === "sticker") {
    addObject(createStickerObject(point));
    state.drawing = false;
    releasePointer(event.pointerId);
  }
}

function moveDraw(event) {
  if (!state.drawing || event.pointerId !== state.activePointerId) return;
  event.preventDefault();
  const point = pointFromEvent(event);

  if (state.dragMode) {
    transformSelected(point);
    render();
    return;
  }

  if (state.tool === "draw") {
    baseCtx.lineTo(point.x, point.y);
    baseCtx.stroke();
    render();
    return;
  }

  if (state.tool === "blur") {
    paintBlur(point);
    render();
    return;
  }

  if (shapeTools.includes(state.tool) || state.tool === "text") {
    state.draftObject = createDraftObject(state.start, point);
    render();
  }
}

function endDraw(event) {
  if (!state.drawing || event.pointerId !== state.activePointerId) return;
  event.preventDefault();
  const point = pointFromEvent(event);

  if (state.dragMode) {
    state.dragMode = null;
    state.dragStartObject = null;
    state.drawing = false;
    releasePointer(event.pointerId);
    pushHistory();
    return;
  }

  if (shapeTools.includes(state.tool) || state.tool === "text") {
    const object = createDraftObject(state.start, point);
    state.draftObject = null;
    if (object && object.width >= 8 && object.height >= 8) {
      addObject(object);
    } else {
      render();
    }
  }

  if (state.tool === "draw" || state.tool === "blur") {
    baseCtx.globalAlpha = 1;
    state.snapshot = null;
    state.blurSource = null;
    render();
    pushHistory();
  }

  state.drawing = false;
  releasePointer(event.pointerId);
}

function releasePointer(pointerId) {
  state.activePointerId = null;
  if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
}

function paintBlur(point) {
  if (!state.blurSource) return;
  const { size, alpha } = getStyle();
  baseCtx.save();
  baseCtx.globalAlpha = alpha;
  baseCtx.beginPath();
  baseCtx.arc(point.x, point.y, size, 0, Math.PI * 2);
  baseCtx.clip();
  baseCtx.drawImage(state.blurSource, 0, 0);
  baseCtx.restore();
}

function createDraftObject(start, end) {
  const style = getStyle();
  const box = normalizedBox(start, end);
  if (state.tool === "text") {
    return {
      id: 0,
      type: "text",
      x: box.x,
      y: box.y,
      width: Math.max(80, box.width),
      height: Math.max(44, box.height),
      text: "텍스트",
      color: style.color,
      alpha: style.alpha,
      bold: style.bold,
      italic: style.italic,
      underline: style.underline,
      strike: style.strike,
      font: style.font,
      align: style.align,
      vAlign: style.vAlign
    };
  }

  return {
    id: 0,
    type: state.tool,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    stroke: style.color,
    fill: style.fill,
    fillColor: style.fillColor,
    lineWidth: style.size,
    alpha: style.alpha,
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y
  };
}

function createStickerObject(point) {
  const { size, alpha } = getStyle();
  const fontSize = Math.max(28, size * 2.2);
  return {
    id: 0,
    type: "sticker",
    x: point.x - fontSize / 2,
    y: point.y - fontSize / 2,
    width: fontSize,
    height: fontSize,
    sticker: state.sticker,
    alpha
  };
}

function normalizedBox(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}

function addObject(object) {
  object.id = state.nextObjectId;
  state.nextObjectId += 1;
  state.objects.push(object);
  selectObject(object.id);
  pushHistory();
  render();
  if (object.type === "text") showTextEditor(object);
}

function drawObject(targetCtx, object) {
  targetCtx.save();
  targetCtx.globalAlpha = object.alpha;

  if (shapeTools.includes(object.type)) drawShapeObject(targetCtx, object);
  if (object.type === "sticker") drawStickerObject(targetCtx, object);
  if (object.type === "text") drawTextObject(targetCtx, object);

  targetCtx.restore();
}

function drawShapeObject(targetCtx, object) {
  targetCtx.strokeStyle = object.stroke;
  targetCtx.fillStyle = object.fillColor;
  targetCtx.lineWidth = object.lineWidth;
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";

  if (object.type === "rect") {
    if (object.fill) targetCtx.fillRect(object.x, object.y, object.width, object.height);
    targetCtx.strokeRect(object.x, object.y, object.width, object.height);
  }

  if (object.type === "roundRect") {
    roundRect(targetCtx, object.x, object.y, object.width, object.height, Math.min(36, Math.max(10, object.lineWidth * 1.4)));
    if (object.fill) targetCtx.fill();
    targetCtx.stroke();
  }

  if (object.type === "ellipse") {
    targetCtx.beginPath();
    targetCtx.ellipse(object.x + object.width / 2, object.y + object.height / 2, Math.max(1, object.width / 2), Math.max(1, object.height / 2), 0, 0, Math.PI * 2);
    if (object.fill) targetCtx.fill();
    targetCtx.stroke();
  }

  if (object.type === "line" || object.type === "arrow") {
    const start = { x: object.startX, y: object.startY };
    const end = { x: object.endX, y: object.endY };
    drawLineLike(targetCtx, object, start, end);
  }
}

function drawLineLike(targetCtx, object, start, end) {
  targetCtx.beginPath();
  targetCtx.moveTo(start.x, start.y);
  targetCtx.lineTo(end.x, end.y);
  targetCtx.stroke();
  if (object.type !== "arrow") return;

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const head = Math.max(18, object.lineWidth * 2.2);
  targetCtx.fillStyle = object.stroke;
  targetCtx.beginPath();
  targetCtx.moveTo(end.x, end.y);
  targetCtx.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
  targetCtx.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
  targetCtx.closePath();
  targetCtx.fill();
}

function drawStickerObject(targetCtx, object) {
  targetCtx.font = `${Math.max(18, object.height)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  targetCtx.fillText(object.sticker, object.x + object.width / 2, object.y + object.height / 2);
}

function drawTextObject(targetCtx, object) {
  const fitted = fitTextToBox(targetCtx, object);
  const lines = fitted.lines;
  const size = fitted.size;
  const lineHeight = size * 1.22;
  const totalHeight = lines.length * lineHeight;
  let y = object.y + size;
  if (object.vAlign === "middle") y = object.y + (object.height - totalHeight) / 2 + size;
  if (object.vAlign === "bottom") y = object.y + object.height - totalHeight + size;

  targetCtx.font = textFont(object, size);
  targetCtx.fillStyle = object.color;
  targetCtx.textBaseline = "alphabetic";
  targetCtx.textAlign = object.align;

  const xMap = {
    left: object.x,
    center: object.x + object.width / 2,
    right: object.x + object.width
  };
  const textX = xMap[object.align];
  lines.forEach((line) => {
    targetCtx.fillText(line, textX, y);
    drawTextDecoration(targetCtx, object, line, textX, y, size);
    y += lineHeight;
  });
}

function fitTextToBox(targetCtx, object) {
  const maxSize = Math.min(180, Math.max(18, object.height * .86));
  const minSize = 10;
  for (let size = maxSize; size >= minSize; size -= 1) {
    targetCtx.font = textFont(object, size);
    const lines = wrapText(targetCtx, object);
    const lineHeight = size * 1.22;
    const widest = Math.max(...lines.map((line) => targetCtx.measureText(line).width), 0);
    if (widest <= object.width && lines.length * lineHeight <= object.height) {
      return { lines, size };
    }
  }
  targetCtx.font = textFont(object, minSize);
  return { lines: wrapText(targetCtx, object), size: minSize };
}

function textFont(object, size) {
  return `${object.italic ? "italic " : ""}${object.bold ? 900 : 500} ${size}px ${object.font || "Pretendard, \"Noto Sans KR\", sans-serif"}`;
}

function wrapText(targetCtx, object) {
  const words = object.text.split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (targetCtx.measureText(test).width > object.width && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [object.text];
}

function drawTextDecoration(targetCtx, object, line, textX, y, size) {
  if (!object.underline && !object.strike) return;
  const width = targetCtx.measureText(line).width;
  let startX = textX;
  if (object.align === "center") startX -= width / 2;
  if (object.align === "right") startX -= width;

  targetCtx.save();
  targetCtx.strokeStyle = object.color;
  targetCtx.lineWidth = Math.max(2, size / 12);
  if (object.underline) {
    targetCtx.beginPath();
    targetCtx.moveTo(startX, y + size * .12);
    targetCtx.lineTo(startX + width, y + size * .12);
    targetCtx.stroke();
  }
  if (object.strike) {
    targetCtx.beginPath();
    targetCtx.moveTo(startX, y - size * .32);
    targetCtx.lineTo(startX + width, y - size * .32);
    targetCtx.stroke();
  }
  targetCtx.restore();
}

function drawSelection(object) {
  const box = objectBounds(object);
  ctx.save();
  ctx.strokeStyle = "#fed002";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 5]);
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.setLineDash([]);
  ctx.fillStyle = "#fed002";
  ctx.fillRect(box.x + box.width - handleSize / 2, box.y + box.height - handleSize / 2, handleSize, handleSize);
  ctx.strokeStyle = "#000000";
  ctx.strokeRect(box.x + box.width - handleSize / 2, box.y + box.height - handleSize / 2, handleSize, handleSize);
  ctx.restore();
}

function objectBounds(object) {
  if (object.type === "line" || object.type === "arrow") {
    return {
      x: Math.min(object.startX, object.endX),
      y: Math.min(object.startY, object.endY),
      width: Math.abs(object.endX - object.startX),
      height: Math.abs(object.endY - object.startY)
    };
  }
  return { x: object.x, y: object.y, width: object.width, height: object.height };
}

function hitTest(point) {
  for (let index = state.objects.length - 1; index >= 0; index -= 1) {
    const object = state.objects[index];
    const box = objectBounds(object);
    const handle = point.x >= box.x + box.width - handleSize && point.x <= box.x + box.width + handleSize
      && point.y >= box.y + box.height - handleSize && point.y <= box.y + box.height + handleSize;
    const inside = point.x >= box.x - 6 && point.x <= box.x + box.width + 6 && point.y >= box.y - 6 && point.y <= box.y + box.height + 6;
    if (handle || inside) return { object, handle };
  }
  return null;
}

function getSelectedObject() {
  return state.objects.find((object) => object.id === state.selectedId) || null;
}

function selectObject(id) {
  if (state.editingTextId && state.editingTextId !== id) hideTextEditor(true);
  state.selectedId = id;
  updateSelectionControls();
  render();
}

function updateSelectionControls() {
  const object = getSelectedObject();
  if (!object) return;
  if (shapeTools.includes(object.type)) {
    setMainColor(object.stroke, false);
    els.fillColorInput.value = object.fillColor;
    els.fillInput.value = object.fill ? "fill" : "none";
    els.sizeInput.value = String(Math.min(90, Math.max(4, object.lineWidth)));
    els.alphaInput.value = String(Math.round(object.alpha * 100));
  }
  if (object.type === "text") {
    setMainColor(object.color, false);
    els.alphaInput.value = String(Math.round(object.alpha * 100));
    els.fontInput.value = object.font || els.fontInput.options[0].value;
    els.textAlignInput.value = object.align;
    els.textVAlignInput.value = object.vAlign;
    setFormatButton(els.boldToggle, object.bold);
    setFormatButton(els.italicToggle, object.italic);
    setFormatButton(els.underlineToggle, object.underline);
    setFormatButton(els.strikeToggle, object.strike);
  }
}

function transformSelected(point) {
  const object = getSelectedObject();
  if (!object || !state.dragStartObject) return;
  const dx = point.x - state.start.x;
  const dy = point.y - state.start.y;
  const original = state.dragStartObject;

  if (state.dragMode === "move") {
    if (object.type === "line" || object.type === "arrow") {
      object.startX = original.startX + dx;
      object.startY = original.startY + dy;
      object.endX = original.endX + dx;
      object.endY = original.endY + dy;
      object.x = Math.min(object.startX, object.endX);
      object.y = Math.min(object.startY, object.endY);
      object.width = Math.abs(object.endX - object.startX);
      object.height = Math.abs(object.endY - object.startY);
      return;
    }
    object.x = original.x + dx;
    object.y = original.y + dy;
    return;
  }

  if (state.dragMode === "resize") {
    object.width = Math.max(12, original.width + dx);
    object.height = Math.max(12, original.height + dy);
    if (object.type === "line" || object.type === "arrow") {
      object.endX = original.endX + dx;
      object.endY = original.endY + dy;
      object.x = Math.min(object.startX, object.endX);
      object.y = Math.min(object.startY, object.endY);
      object.width = Math.abs(object.endX - object.startX);
      object.height = Math.abs(object.endY - object.startY);
    }
  }
}

function normalizeHex(value) {
  const raw = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.split("").map((char) => char + char).join("")}`.toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) {
    return `#${raw}`.toLowerCase();
  }
  return null;
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function setMainColor(value, applyStyle = true) {
  const hex = normalizeHex(value);
  if (!hex) return false;
  els.colorInput.value = hex;
  els.hexInput.value = hex;
  updateSwatches(hex);
  if (applyStyle) applySelectedStyle();
  return true;
}

function updateSwatches(hex = els.colorInput.value) {
  document.querySelectorAll(".swatch").forEach((button) => {
    button.classList.toggle("active", button.dataset.color.toLowerCase() === hex.toLowerCase());
  });
}

async function startEyedropper() {
  hideTextEditor(true);
  if ("EyeDropper" in window) {
    try {
      const result = await new EyeDropper().open();
      setMainColor(result.sRGBHex);
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  state.pickingColor = true;
  document.body.classList.add("picking-color");
  updateMeta("캔버스에서 색상을 찍어주세요");
}

function pickColorFromCanvas(point) {
  const pixel = ctx.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data;
  setMainColor(rgbToHex(pixel[0], pixel[1], pixel[2]));
  state.pickingColor = false;
  document.body.classList.remove("picking-color");
  updateMeta(`${canvas.width} x ${canvas.height}`);
}

function applySelectedStyle() {
  const object = getSelectedObject();
  if (!object) return;
  const style = getStyle();
  if (shapeTools.includes(object.type)) {
    object.stroke = style.color;
    object.fillColor = style.fillColor;
    object.fill = style.fill;
    object.lineWidth = style.size;
    object.alpha = style.alpha;
  }
  if (object.type === "text") {
    object.color = style.color;
    object.alpha = style.alpha;
    object.bold = style.bold;
    object.italic = style.italic;
    object.underline = style.underline;
    object.strike = style.strike;
    object.font = style.font;
    object.align = style.align;
    object.vAlign = style.vAlign;
  }
  render();
  if (object.type === "text" && state.editingTextId === object.id) positionTextEditor(object);
  pushHistory();
}

function showTextEditor(object) {
  state.editingTextId = object.id;
  const fitted = fitTextToBox(ctx, object);
  els.textEditor.value = object.text;
  els.textEditor.classList.add("active");
  positionTextEditor(object, fitted.size);
  els.textEditor.focus();
  els.textEditor.select();
}

function positionTextEditor(object, fittedSize = null) {
  const canvasRect = canvas.getBoundingClientRect();
  const wrapRect = els.canvasDropZone.getBoundingClientRect();
  const scale = canvasDisplayScale();
  const displaySize = fittedSize || fitTextToBox(ctx, object).size;
  els.textEditor.style.left = `${canvasRect.left - wrapRect.left + object.x * scale.x}px`;
  els.textEditor.style.top = `${canvasRect.top - wrapRect.top + object.y * scale.y}px`;
  els.textEditor.style.width = `${Math.max(32, object.width * scale.x)}px`;
  els.textEditor.style.height = `${Math.max(24, object.height * scale.y)}px`;
  els.textEditor.style.color = object.color;
  els.textEditor.style.font = textFont(object, displaySize * scale.y);
  els.textEditor.style.textAlign = object.align;
}

function hideTextEditor(commit) {
  if (!state.editingTextId) return;
  const object = state.objects.find((item) => item.id === state.editingTextId);
  if (commit && object) {
    object.text = els.textEditor.value.trim() || "텍스트";
    pushHistory();
  }
  state.editingTextId = null;
  els.textEditor.classList.remove("active");
  render();
}

function handleCanvasDoubleClick(event) {
  const hit = hitTest(pointFromEvent(event));
  if (hit?.object.type === "text") {
    selectObject(hit.object.id);
    showTextEditor(hit.object);
  }
}

function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll(".tool").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
}

function setFormatButton(button, active) {
  button.classList.toggle("active", active);
}

function downloadImage() {
  hideTextEditor(true);
  render(false);
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
  render();
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

["input", "change"].forEach((eventName) => {
  [els.fillColorInput, els.fillInput, els.sizeInput, els.alphaInput, els.fontInput, els.textAlignInput, els.textVAlignInput].forEach((element) => {
    element.addEventListener(eventName, applySelectedStyle);
  });
});

els.colorInput.addEventListener("input", () => setMainColor(els.colorInput.value));
els.hexInput.addEventListener("change", () => {
  if (!setMainColor(els.hexInput.value)) {
    els.hexInput.value = els.colorInput.value;
  }
});
els.hexInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    els.hexInput.blur();
  }
});
document.querySelectorAll(".swatch").forEach((button) => {
  button.addEventListener("click", () => setMainColor(button.dataset.color));
});
els.eyedropperButton.addEventListener("click", startEyedropper);

els.textEditor.addEventListener("input", () => {
  const object = state.objects.find((item) => item.id === state.editingTextId);
  if (!object) return;
  object.text = els.textEditor.value || "텍스트";
  render();
  positionTextEditor(object);
});
els.textEditor.addEventListener("blur", () => hideTextEditor(true));
els.textEditor.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    hideTextEditor(false);
  }
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    hideTextEditor(true);
  }
});

[els.boldToggle, els.italicToggle, els.underlineToggle, els.strikeToggle].forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("active");
    applySelectedStyle();
  });
});

els.imageInput.addEventListener("change", (event) => loadFile(event.target.files[0]));
[els.uploadDropZone, els.canvasDropZone].forEach((dropZone) => {
  dropZone.addEventListener("dragenter", handleImageDrag);
  dropZone.addEventListener("dragover", handleImageDrag);
  dropZone.addEventListener("dragleave", clearImageDrag);
  dropZone.addEventListener("drop", handleImageDrop);
});
els.sampleButton.addEventListener("click", drawSample);
els.resetButton.addEventListener("click", resetToOriginal);
els.undoButton.addEventListener("click", () => {
  if (state.history.length <= 1) return;
  state.history.pop();
  restoreState(state.history[state.history.length - 1]);
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
canvas.addEventListener("dblclick", handleCanvasDoubleClick);

drawSample();
updateSwatches();
