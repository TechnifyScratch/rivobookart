let folds = [];
let currentPage = 0;

function generate() {
  const pageHeight = parseFloat(document.getElementById("pageHeight").value);
  const pageWidth = parseFloat(document.getElementById("pageWidth").value);
  const numPages = parseInt(document.getElementById("numPages").value);
  const word = document.getElementById("foldWord").value;

  if (!word) {
    alert("Enter a word to fold!");
    return;
  }

  // Render word to bitmap
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = numPages;
  tempCanvas.height = 200;
  const tctx = tempCanvas.getContext("2d");
  tctx.fillStyle = "white";
  tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tctx.fillStyle = "black";
  tctx.font = "bold 150px Arial";
  tctx.textAlign = "center";
  tctx.textBaseline = "middle";
  tctx.fillText(word, tempCanvas.width / 2, tempCanvas.height / 2);

  const imageData = tctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;

  folds = [];
  for (let x = 0; x < numPages; x++) {
    let topY = null;
    let bottomY = null;

    for (let y = 0; y < tempCanvas.height; y++) {
      const idx = (y * tempCanvas.width + x) * 4;
      const isBlack = imageData[idx] < 128;
      if (isBlack) {
        if (topY === null) topY = y;
        bottomY = y;
      }
    }

    if (topY !== null && bottomY !== null) {
      const topMM = (topY / tempCanvas.height) * pageHeight;
      const bottomMM = (bottomY / tempCanvas.height) * pageHeight;
      folds.push({ top: topMM, bottom: bottomMM });
    } else {
      folds.push(null);
    }
  }

  currentPage = 0;
  showPage(currentPage, pageHeight, pageWidth);
}

function drawPageDiagram(ctx, pageHeight, pageWidth, fold) {
  // Clear
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw page rectangle
  ctx.strokeStyle = "black";
  ctx.strokeRect(50, 50, pageWidth, pageHeight);

  if (fold) {
    ctx.strokeStyle = "red";

    // Top fold
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(50 + pageWidth, 50 + fold.top);
    ctx.stroke();

    // Bottom fold
    ctx.beginPath();
    ctx.moveTo(50, 50 + pageHeight);
    ctx.lineTo(50 + pageWidth, 50 + fold.bottom);
    ctx.stroke();
  }
}

function showPage(n, pageHeight, pageWidth) {
  const canvas = document.getElementById("pageCanvas");
  const ctx = canvas.getContext("2d");

  const fold = folds[n];
  drawPageDiagram(ctx, pageHeight, pageWidth, fold);

  if (fold) {
    document.getElementById("pageText").innerText =
      `Page ${n + 1}: Fold top corner down to ${fold.top.toFixed(1)} mm, `
      + `and bottom corner up to ${fold.bottom.toFixed(1)} mm.`;
  } else {
    document.getElementById("pageText").innerText =
      `Page ${n + 1}: No folds needed.`;
  }

  document.getElementById("pageNum").innerText = `Page ${n + 1}`;
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    const pageHeight = parseFloat(document.getElementById("pageHeight").value);
    const pageWidth = parseFloat(document.getElementById("pageWidth").value);
    showPage(currentPage, pageHeight, pageWidth);
  }
}

function nextPage() {
  if (currentPage < folds.length - 1) {
    currentPage++;
    const pageHeight = parseFloat(document.getElementById("pageHeight").value);
    const pageWidth = parseFloat(document.getElementById("pageWidth").value);
    showPage(currentPage, pageHeight, pageWidth);
  }
}

async function downloadPDF() {
  if (!folds.length) {
    alert("Generate instructions first!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Book Folding Instructions (2-Fold Method)", 20, 20);

  const pageHeight = parseFloat(document.getElementById("pageHeight").value);
  const pageWidth = parseFloat(document.getElementById("pageWidth").value);

  let y = 30;
  for (let i = 0; i < folds.length; i++) {
    const fold = folds[i];

    if (y > 230) { // keep space for diagram
      doc.addPage();
      y = 20;
    }

    // Text instructions
    if (fold) {
      doc.text(
        `Page ${i + 1}: Top fold at ${fold.top.toFixed(1)} mm, Bottom fold at ${fold.bottom.toFixed(1)} mm`,
        20, y
      );
    } else {
      doc.text(`Page ${i + 1}: No folds`, 20, y);
    }

    // Render diagram to offscreen canvas
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 300;
    tempCanvas.height = 500;
    const tctx = tempCanvas.getContext("2d");
    drawPageDiagram(tctx, pageHeight, pageWidth, fold);

    const imgData = tempCanvas.toDataURL("image/png");
    doc.addImage(imgData, "PNG", 20, y + 5, 60, 100);

    y += 120;
  }

  doc.save("folding_instructions.pdf");
}
