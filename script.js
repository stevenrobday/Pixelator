const maskFile = document.getElementById("maskFile"),
  maskBtn = document.getElementById("maskBtn"),
  maskCanvas = document.getElementById("maskCanvas"),
  maskCtx = maskCanvas.getContext("2d"),
  csvFile = document.getElementById("csvFile"),
  importBtn = document.getElementById("importBtn"),
  exportBtn = document.getElementById("exportBtn"),
  generateBtn = document.getElementById("generateBtn"),
  originalFile = document.getElementById("originalFile"),
  originalBtn = document.getElementById("originalBtn"),
  originalCanvas = document.getElementById("originalCanvas"),
  originalCtx = originalCanvas.getContext("2d"),
  modalShade = document.getElementById("modalShade"),
  modalWrap = document.getElementById("modalWrap"),
  modalCanvas = document.getElementById("modalCanvas"),
  modalCtx = modalCanvas.getContext("2d"),
  pixelatedCanvas = document.getElementById("pixelatedCanvas"),
  pixelatedCtx = pixelatedCanvas.getContext("2d"),
  ditheredCanvas = document.getElementById("ditheredCanvas"),
  ditheredCtx = ditheredCanvas.getContext("2d"),
  hoverPixelVal = document.getElementById("hoverPixelVal");

let maskData,
  eyedropperObj = {},
  resetHoverObj = {},
  mouseTimeout,
  scale = 1,
  zoomOrigin = { x: 0, y: 0 },
  oldScale = 1,
  modalOpen = false;

maskFile.addEventListener("change", (e) => {
  drawImageToCanvas(e, maskCanvas, maskCtx);
});

maskBtn.addEventListener("click", (e) => {
  maskFile.click();
});

originalFile.addEventListener("change", (e) => {
  drawImageToCanvas(e, originalCanvas, originalCtx);
});

originalBtn.addEventListener("click", (e) => {
  originalFile.click();
});

modalWrap.addEventListener("click", function (e) {
  if (e.target.nodeName !== "CANVAS") closeModal();
});

modalCanvas.addEventListener("mousedown", (e) => {
  resetHover();
  const pos = getPosition(e);

  closeModal();

  const pixel = originalCtx.getImageData(pos.x, pos.y, 1, 1);
  const inputVal = pixel.data[0];

  const col = `#colColorRanges_${eyedropperObj.col}`;
  const fields = document.querySelector(
    `${col} > :nth-child(${eyedropperObj.row})`
  );
  const input = fields.querySelector(`input[data-pos="${eyedropperObj.pos}"]`);
  input.value = inputVal;
  changedInput(input);
});

modalCanvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  modalCtx.save();

  let pos = getCoords(e);
  if (-1 * Math.sign(e.deltaY) === 1) {
    scale += scale * 1.1 - oldScale;
    if (scale > 8) scale = oldScale;
    else {
      zoomOrigin.x = pos.x - (pos.x - zoomOrigin.x) * 1.1;
      zoomOrigin.y = pos.y - (pos.y - zoomOrigin.y) * 1.1;
      modalCtx.setTransform(scale, 0, 0, scale, zoomOrigin.x, zoomOrigin.y);
      modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
      modalCtx.drawImage(originalCanvas, 0, 0);
      modalCtx.restore();
    }
  } else {
    if (scale <= 1) {
      scale = 1;
      zoomOrigin = { x: 0, y: 0 };
      modalCtx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      scale -= scale - oldScale / 1.1;
      zoomOrigin.x = pos.x - (pos.x - zoomOrigin.x) / 1.1;
      zoomOrigin.y = pos.y - (pos.y - zoomOrigin.y) / 1.1;
      modalCtx.setTransform(scale, 0, 0, scale, zoomOrigin.x, zoomOrigin.y);
    }
    modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
    modalCtx.drawImage(originalCanvas, 0, 0);
    modalCtx.restore();
  }
  oldScale = scale;

  mouseMoved(e);
});

modalCanvas.addEventListener("mousemove", (e) => {
  mouseMoved(e);
});

modalCanvas.addEventListener("mouseleave", (e) => {
  clearTimeout(mouseTimeout);
});

//modified from https://sebhastian.com/javascript-csv-to-array/
csvFile.addEventListener("change", (e) => {
  const input = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (event) {
    const text = event.target.result;

    const headers = text.slice(0, text.indexOf("\n")).split(",");

    const rows = text.slice(text.indexOf("\n") + 1).split("\n");

    const csvArray = rows.map(function (row) {
      const values = row.split(",");
      return headers.reduce(function (object, header, index) {
        object[header] = values[index];
        return object;
      }, {});
    });

    csvArray.forEach((el) => {
      const colorSquare = document.querySelector(
        `#colColorRanges_1 > div[data-hex="${el.hex}"]`
      );
      const row =
        Array.from(colorSquare.parentNode.children).indexOf(colorSquare) + 1;
      for (let i = 2; i <= 8; i++) {
        const colEl = `#colColorRanges_${i}`;
        const fields = document.querySelector(`${colEl} > :nth-child(${row})`);
        const firstInput = fields.querySelector(`input[data-pos="first"]`);
        const lastInput = fields.querySelector(`input[data-pos="last"]`);
        const firstInputVal = parseInt(el[`col_${i}_first`]);
        const lastInputVal = parseInt(el[`col_${i}_last`]);
        if (
          Number.isInteger(firstInputVal) &&
          firstInputVal >= 0 &&
          firstInputVal <= 255
        )
          firstInput.value = firstInputVal;
        if (
          Number.isInteger(lastInputVal) &&
          lastInputVal >= 0 &&
          lastInputVal <= 255
        )
          lastInput.value = lastInputVal;
        if (i % 2 === 1) {
          const checkbox = fields.querySelector(`input[type="checkbox"]`);
          if (el[`col_${i}_checkbox`] === "true") {
            checkbox.checked = true;
            firstInput.disabled = false;
            lastInput.disabled = false;
          } else {
            checkbox.checked = false;
            firstInput.disabled = true;
            lastInput.disabled = true;
          }
        }
      }
    });
  };

  reader.readAsText(input);
});

importBtn.addEventListener("click", (e) => {
  csvFile.click();
});

exportBtn.addEventListener("click", (e) => {
  const csvArray = [
    [
      "hex",
      "col_2_first",
      "col_2_last",
      "col_3_first",
      "col_3_last",
      "col_3_checkbox",
      "col_4_first",
      "col_4_last",
      "col_5_first",
      "col_5_last",
      "col_5_checkbox",
      "col_6_first",
      "col_6_last",
      "col_7_first",
      "col_7_last",
      "col_7_checkbox",
      "col_8_first",
      "col_8_last",
    ],
  ];

  let row = 1;
  for (const hex in maskData) {
    const colorSquare = document.querySelector(
      `#colColorRanges_1 > :nth-child(${row})`
    );
    const csvRowArray = [colorSquare.dataset.hex];
    for (let i = 2; i <= 8; i++) {
      const colEl = `#colColorRanges_${i}`;
      const fields = document.querySelector(`${colEl} > :nth-child(${row})`);
      const firstInput = fields.querySelector(`input[data-pos="first"]`);
      const lastInput = fields.querySelector(`input[data-pos="last"]`);
      const firstInputVal = parseInt(firstInput.value.trim());
      const lastInputVal = parseInt(lastInput.value.trim());
      csvRowArray.push(`${firstInputVal}`);
      csvRowArray.push(`${lastInputVal}`);
      if (i % 2 === 1) {
        const checkbox = fields.querySelector(`input[type="checkbox"]`);
        csvRowArray.push(`${checkbox.checked}`);
      }
    }
    csvArray.push(csvRowArray);
    row++;
  }

  let csvContent = csvArray.join("\r\n");

  let file = new File([csvContent], "download", { type: "text/csv" });
  let exportUrl = URL.createObjectURL(file);
  window.location.assign(exportUrl);
  URL.revokeObjectURL(exportUrl);
});

generateBtn.addEventListener("click", (e) => {
  generateRows();
});

function generateRows() {
  let row = 1;
  for (const maskHex in maskData) {
    generateRow(maskHex, row);
    row++;
  }
}

function drawImageToCanvas(e, canvas, ctx) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      if (canvas.width && canvas.height)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const id = canvas.id;
      if (id === "maskCanvas") maskUploaded();
      else if (id === "originalCanvas") originalUploaded();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
}

function maskUploaded() {
  if (pixelatedCanvas.width && pixelatedCanvas.height)
    pixelatedCtx.clearRect(0, 0, pixelatedCanvas.width, pixelatedCanvas.height);
  pixelatedCanvas.width = maskCanvas.width;
  pixelatedCanvas.height = maskCanvas.height;

  const imageData = maskCtx.getImageData(
    0,
    0,
    maskCanvas.width,
    maskCanvas.height
  );
  const data = imageData.data;
  const width = imageData.width;
  const length = data.length;

  maskData = {};

  // store coordinates for each color in mask
  for (let i = 0; i < length; i += 4) {
    // skip transparent pixels
    if (data[i + 3]) {
      let hex = rgbToHex(data[i], data[i + 1], data[i + 2]);
      if (!maskData.hasOwnProperty(`#${hex}`)) maskData[`#${hex}`] = [];
      let coords = {};
      coords.x = (i / 4) % width;
      coords.y = Math.floor(i / 4 / width);
      maskData[`#${hex}`].push(coords);
    }
  }

  originalBtn.style.visibility = "visible";

  const oldMaskElements = document.querySelectorAll(".maskData");
  for (let el of oldMaskElements) {
    el.remove();
  }

  const inputsWrapper = document.createElement("div");
  inputsWrapper.classList.add("inputsWrapper");
  inputsWrapper.classList.add("maskData");

  const input = document.createElement("input");
  input.type = "number";
  input.setAttribute("min", "0");
  input.setAttribute("max", "255");

  const eyedropper = document.createElement("img");
  eyedropper.classList.add("eyedropper");
  eyedropper.src = "eye-dropper-solid.svg";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = true;

  const col_1 = document.getElementById("colColorRanges_1");
  let row = 1;

  let inputChange = (e) => changedInput(e.target);

  let eyedropperClick = (e) => {
    modalOpen = true;
    modalShade.style.display = "block";
    modalWrap.style.display = "flex";
    eyedropperObj = { ...e.target.dataset };
  };

  let checkboxChange = (e) => {
    const checkbox = e.target;
    const data = checkbox.dataset;
    const isChecked = checkbox.checked;
    const col = data.col;
    const row = data.row;
    const colEl = `#colColorRanges_${col}`;
    const fields = document.querySelector(`${colEl} > :nth-child(${row})`);
    const firstInput = fields.querySelector(`input[data-pos="first"]`);
    const lastInput = fields.querySelector(`input[data-pos="last"]`);

    if (isChecked) {
      firstInput.disabled = false;
      lastInput.disabled = false;
    } else {
      firstInput.disabled = true;
      lastInput.disabled = true;
    }
  };

  for (const hex in maskData) {
    const colorSquare = document.createElement("div");
    colorSquare.classList.add("colorSquare", "maskData");
    colorSquare.dataset.hex = hex;
    colorSquare.style.backgroundColor = hex;
    col_1.appendChild(colorSquare);

    for (let i = 2; i <= 8; i++) {
      const col = document.getElementById(`colColorRanges_${i}`);

      const newInputFirst = input.cloneNode();
      newInputFirst.dataset.col = `${i}`;
      newInputFirst.dataset.row = `${row}`;
      newInputFirst.addEventListener("change", inputChange);
      const newInputLast = newInputFirst.cloneNode();
      newInputFirst.dataset.pos = "first";
      newInputLast.dataset.pos = "last";
      newInputLast.addEventListener("change", inputChange);

      switch (i) {
        case 2:
          newInputFirst.value = 0;
          break;
        case 8:
          newInputLast.value = 255;
          break;
      }

      const eyedropperFirst = eyedropper.cloneNode();
      eyedropperFirst.dataset.col = `${i}`;
      eyedropperFirst.dataset.row = `${row}`;
      eyedropperFirst.addEventListener("click", eyedropperClick);
      const eyedropperLast = eyedropperFirst.cloneNode();
      eyedropperFirst.dataset.pos = "first";
      eyedropperLast.dataset.pos = "last";
      eyedropperLast.addEventListener("click", eyedropperClick);

      const newWrap = inputsWrapper.cloneNode();
      newWrap.appendChild(newInputFirst);
      newWrap.appendChild(eyedropperFirst);
      newWrap.appendChild(newInputLast);
      newWrap.appendChild(eyedropperLast);

      if (i % 2 === 1) {
        const ditherCheckbox = checkbox.cloneNode();
        ditherCheckbox.dataset.col = `${i}`;
        ditherCheckbox.dataset.row = `${row}`;
        ditherCheckbox.addEventListener("change", checkboxChange);
        newWrap.appendChild(ditherCheckbox);
      }
      col.appendChild(newWrap);
    }
    row++;
  }
}

function changedInput(input) {
  const inputVal = parseInt(input.value.trim());
  if (!Number.isInteger(inputVal)) input.value = "";
  else {
    const data = input.dataset;
    const pos = data.pos;
    const col = parseInt(data.col);
    const row = data.row;

    if (pos === "first" && col > 2) {
      let previousCol = col - 1;
      let colEl = `#colColorRanges_${previousCol}`;
      let fields = document.querySelector(`${colEl} > :nth-child(${row})`);
      // if previous column is a dither column and unchecked, go to the column before
      if (col % 2 === 0) {
        const checkbox = fields.querySelector(`input[type="checkbox"]`);
        if (!checkbox.checked) {
          previousCol = col - 2;
          colEl = `#colColorRanges_${previousCol}`;
          fields = document.querySelector(`${colEl} > :nth-child(${row})`);
        }
      }
      const lastInput = fields.querySelector(`input[data-pos="last"]`);
      lastInput.value = inputVal - 1;
    } else if (pos === "last" && col < 8) {
      let nextCol = col + 1;
      let colEl = `#colColorRanges_${nextCol}`;
      let fields = document.querySelector(`${colEl} > :nth-child(${row})`);
      if (col % 2 === 0) {
        const checkbox = fields.querySelector(`input[type="checkbox"]`);
        if (!checkbox.checked) {
          nextCol = col + 2;
          colEl = `#colColorRanges_${nextCol}`;
          fields = document.querySelector(`${colEl} > :nth-child(${row})`);
        }
      }
      const nextInput = fields.querySelector(`input[data-pos="first"]`);
      nextInput.value = inputVal + 1;
    }

    let completedFields = 0;
    for (let i = 2; i <= 8; i += 2) {
      const colEl = `#colColorRanges_${i}`;
      const fields = document.querySelector(`${colEl} > :nth-child(${row})`);
      const firstInput = fields.querySelector(`input[data-pos="first"]`);
      const lastInput = fields.querySelector(`input[data-pos="last"]`);
      const firstInputVal = parseInt(firstInput.value.trim());
      const lastInputVal = parseInt(lastInput.value.trim());
      if (
        Number.isInteger(firstInputVal) &&
        Number.isInteger(lastInputVal) &&
        firstInputVal >= 0 &&
        firstInputVal <= 255 &&
        lastInputVal >= 0 &&
        lastInputVal <= 255
      )
        completedFields++;
    }

    if (completedFields === 4) {
      const rowColor = document.querySelector(
        `#colColorRanges_1 > :nth-child(${row})`
      );
      const maskHex = rowColor.dataset.hex;
      generateRow(maskHex, row);
    }
  }
}

function closeModal() {
  modalOpen = false;
  modalShade.style.display = "none";
  modalWrap.style.display = "none";
  scale = 1;
  oldScale = 1;
  zoomOrigin = { x: 0, y: 0 };
  modalCtx.save();
  modalCtx.setTransform(1, 0, 0, 1, 0, 0);
  modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
  modalCtx.drawImage(originalCanvas, 0, 0);
  modalCtx.restore();
}

function resetHover() {
  if (Object.keys(resetHoverObj).length) {
    let data = resetHoverObj.data;
    let pos = resetHoverObj.pos;
    resetHoverObj = {};

    fillPixel(
      modalCtx,
      `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`,
      pos.x,
      pos.y
    );
    hoverPixelVal.textContent = "";
  }
}

function mouseMoved(e) {
  clearTimeout(mouseTimeout);
  resetHover();
  mouseTimeout = setTimeout(function () {
    mouseStopped(e);
  }, 300);
}

function mouseStopped(e) {
  if (modalOpen) {
    // avoid console error
    let pos = getCoords(e);
    const pixel = modalCtx.getImageData(pos.x, pos.y, 1, 1);
    const data = pixel.data;
    if (data[3] === 255) {
      highlightPixel(pos, data);
      showPixelVal(e, pos);
    }
  }
}

function highlightPixel(pos, data) {
  resetHoverObj = { pos, data };
  fillPixel(modalCtx, "#f1e740", pos.x, pos.y);
}

function showPixelVal(e) {
  const pos = getPosition(e);
  const pixel = originalCtx.getImageData(pos.x, pos.y, 1, 1);
  const pixelData = pixel.data;
  hoverPixelVal.textContent = `${pixelData[0]}`;
  const offset = modalCanvas.getBoundingClientRect();
  let x = e.offsetX + offset.left - hoverPixelVal.offsetWidth / 2;
  let y = e.offsetY - 20;
  if (y < 0) {
    x -= 20;
    y = e.offsetY + 4;
  }
  hoverPixelVal.style.left = x + "px";
  hoverPixelVal.style.top = y + "px";
}

function fillPixel(ctx, color, x, y) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
  ctx.restore();
}

function getPosition(e) {
  if (zoomOrigin.x === 0 && zoomOrigin.y === 0 && scale === 1)
    return getCoords(e);
  return getScaledCoords(zoomOrigin, scale, e);
}

function getCoords(e) {
  let pos = {};
  pos.x = Math.floor((e.offsetX * modalCanvas.width) / modalCanvas.clientWidth);
  pos.y = Math.floor(
    (e.offsetY * modalCanvas.height) / modalCanvas.clientHeight
  );
  return pos;
}

function getScaledCoords(zoomOrigin, scale, e) {
  let transformX = Math.abs(zoomOrigin.x / scale);
  let transformY = Math.abs(zoomOrigin.y / scale);
  let offsetX =
    (e.offsetX * modalCanvas.width) / modalCanvas.clientWidth / scale;
  let offsetY =
    (e.offsetY * modalCanvas.height) / modalCanvas.clientHeight / scale;
  let x = Math.floor(transformX + offsetX);
  let y = Math.floor(transformY + offsetY);
  return { x, y };
}

function originalUploaded() {
  if (modalCanvas.width && modalCanvas.height)
    modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
  modalCanvas.width = originalCanvas.width;
  modalCanvas.height = originalCanvas.height;
  modalCtx.drawImage(originalCanvas, 0, 0);
  document.getElementById("colorPanel").style.visibility = "visible";
  sierraTwoRow();
  automateInput();
  generateRows();
}

function automateInput() {
  let row = 1;
  for (const maskHex in maskData) {
    automateInputRow(maskHex, row);
    generateRow(maskHex, row);
    row++;
  }
}

function automateInputRow(maskHex, row) {
  let pixelArray = [];
  const coordsArray = maskData[`${maskHex}`];
  const length = coordsArray.length;
  for (let i = 0; i < length; i++) {
    const coords = coordsArray[i];
    const x = coords.x;
    const y = coords.y;
    const pixel = originalCtx.getImageData(x, y, 1, 1);
    pixelArray.push(pixel.data[0]);
  }

  pixelArray.sort(function (a, b) {
    return a - b;
  });

  const pixelArrayLength = pixelArray.length;
  const subsetLength = Math.floor(pixelArrayLength / 7);

  for (let i = 2; i <= 8; i++) {
    const col = `#colColorRanges_${i}`;
    const fields = document.querySelector(`${col} > :nth-child(${row})`);

    const firstInput = fields.querySelector(`input[data-pos="first"]`);
    const lastInput = fields.querySelector(`input[data-pos="last"]`);

    let subsetRow = i - 2;
    let firstInputArrayPos = subsetRow * subsetLength;
    let lastInputArrayPos = subsetRow * subsetLength + subsetLength - 1;

    if (i === 2) lastInput.value = pixelArray[lastInputArrayPos];
    else if (i === 8) firstInput.value = pixelArray[firstInputArrayPos];
    else {
      firstInput.value = pixelArray[firstInputArrayPos];
      lastInput.value = pixelArray[lastInputArrayPos];
    }
  }
}

function generateRow(maskHex, row) {
  let valArray = [];
  for (let i = 2; i <= 8; i++) {
    const header = `#header_${i}`;
    const col = `#colColorRanges_${i}`;
    const fields = document.querySelector(`${col} > :nth-child(${row})`);
    let ditherObj;
    if (i % 2 === 1) {
      const checkbox = fields.querySelector(`input[type="checkbox"]`);
      if (!checkbox.checked) continue;

      let header = `#header_${i - 1}`;
      let colColor = document.querySelector(`${header} > :first-child`);
      const darkHex = colColor.dataset.hex;
      header = `#header_${i + 1}`;
      colColor = document.querySelector(`${header} > :first-child`);
      const lightHex = colColor.dataset.hex;
      ditherObj = { darkHex, lightHex };
    }
    const firstInput = fields.querySelector(`input[data-pos="first"]`);
    const lastInput = fields.querySelector(`input[data-pos="last"]`);
    const firstInputVal = parseInt(firstInput.value.trim());
    const lastInputVal = parseInt(lastInput.value.trim());
    if (
      Number.isInteger(firstInputVal) &&
      Number.isInteger(lastInputVal) &&
      firstInputVal >= 0 &&
      firstInputVal <= 255 &&
      lastInputVal >= 0 &&
      lastInputVal <= 255
    ) {
      let fillHex;
      if (i % 2 === 0) {
        const colColor = document.querySelector(`${header} > :first-child`);
        fillHex = colColor.dataset.hex;
      }
      valArray.push({ firstInputVal, lastInputVal, fillHex, ditherObj });
    }
  }
  const coordsArray = maskData[`${maskHex}`];
  const length = coordsArray.length;
  for (let i = 0; i < length; i++) {
    const coords = coordsArray[i];
    const x = coords.x;
    const y = coords.y;
    const pixel = originalCtx.getImageData(x, y, 1, 1);
    const pixelVal = pixel.data[0];
    const ditheredPixel = ditheredCtx.getImageData(x, y, 1, 1);
    const ditheredPixelVal = ditheredPixel.data[0];
    valArray.every((e) => {
      if (pixelVal >= e.firstInputVal && pixelVal <= e.lastInputVal) {
        const fillHex = e.fillHex;
        if (fillHex) fillPixel(pixelatedCtx, fillHex, x, y);
        else if (ditheredPixelVal)
          fillPixel(pixelatedCtx, e.ditherObj.lightHex, x, y);
        else fillPixel(pixelatedCtx, e.ditherObj.darkHex, x, y);
        return false;
      }
      return true;
    });
  }
}

function componentToHex(c) {
  let hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return componentToHex(r) + componentToHex(g) + componentToHex(b);
}

//modified from https://www.gingerbeardman.com/canvas-dither/
function sierraTwoRow() {
  if (ditheredCanvas.width && ditheredCanvas.height)
    ditheredCtx.clearRect(0, 0, ditheredCanvas.width, ditheredCanvas.height);
  const image = originalCtx.getImageData(
    0,
    0,
    originalCanvas.width,
    originalCanvas.height
  );
  const imageWidth = image.width;
  const imageHeight = image.height;
  imageLength = image.data.length;

  for (currentPixel = 0; currentPixel <= imageLength; currentPixel += 4) {
    if (image.data[currentPixel] <= 128) {
      newPixelColour = 0;
    } else {
      newPixelColour = 255;
    }

    err = (image.data[currentPixel] - newPixelColour) / 16;
    image.data[currentPixel] = newPixelColour;

    image.data[currentPixel + 4] += err * 4;
    image.data[currentPixel + 8] += err * 3;

    image.data[currentPixel + 4 * imageWidth - 8] += err * 1;
    image.data[currentPixel + 4 * imageWidth - 4] += err * 2;
    image.data[currentPixel + 4 * imageWidth] += err * 3;
    image.data[currentPixel + 4 * imageWidth + 4] += err * 2;
    image.data[currentPixel + 4 * imageWidth + 8] += err * 1;

    image.data[currentPixel + 1] = image.data[currentPixel + 2] =
      image.data[currentPixel];
  }

  ditheredCanvas.width = imageWidth;
  ditheredCanvas.height = imageHeight;
  ditheredCtx.putImageData(image, 0, 0);
}

//generates dithered canvas, modified from https://github.com/NielsLeenheer/CanvasDither/blob/master/src/canvas-dither.js
// function floydSteinberg() {
//     if (ditheredCanvas.width && ditheredCanvas.height) ditheredCtx.clearRect(0, 0, ditheredCanvas.width, ditheredCanvas.height);
//     const image = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
//     const width = image.width;
//     const height = image.height;
//     const luminance = new Uint8ClampedArray(width * height);

//     for (let l = 0, i = 0; i < image.data.length; l++, i += 4) {
//         luminance[l] = (image.data[i] * 0.299) + (image.data[i + 1] * 0.587) + (image.data[i + 2] * 0.114);
//     }

//     for (let l = 0, i = 0; i < image.data.length; l++, i += 4) {
//         const value = luminance[l] < 129 ? 0 : 255;
//         const error = Math.floor((luminance[l] - value) / 16);
//         image.data.fill(value, i, i + 3);

//         luminance[l + 1] += error * 7;
//         luminance[l + width - 1] += error * 3;
//         luminance[l + width] += error * 5;
//         luminance[l + width + 1] += error * 1;
//     }

//     ditheredCanvas.width = width;
//     ditheredCanvas.height = height;
//     ditheredCtx.putImageData(image, 0, 0);
// }

// FLOYD STEINBERG works better for this app
// function atkinson() {
//     if (ditheredCanvas.width && ditheredCanvas.height) ditheredCtx.clearRect(0, 0, ditheredCanvas.width, ditheredCanvas.height);
//     const image = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
//     const width = image.width;
//     const height = image.height;
//
//     const luminance = new Uint8ClampedArray(width * height);
//
//     for (let l = 0, i = 0; i < image.data.length; l++, i += 4) {
//         luminance[l] = (image.data[i] * 0.299) + (image.data[i + 1] * 0.587) + (image.data[i + 2] * 0.114);
//     }
//
//     for (let l = 0, i = 0; i < image.data.length; l++, i += 4) {
//         const value = luminance[l] < 129 ? 0 : 255;
//         const error = Math.floor((luminance[l] - value) / 8);
//         image.data.fill(value, i, i + 3);
//
//         luminance[l + 1] += error;
//         luminance[l + 2] += error;
//         luminance[l + width - 1] += error;
//         luminance[l + width] += error;
//         luminance[l + width + 1] += error;
//         luminance[l + 2 * width] += error;
//     }
//
//     ditheredCanvas.width = width;
//     ditheredCanvas.height = height;
//     ditheredCtx.putImageData(image, 0, 0);
// }
