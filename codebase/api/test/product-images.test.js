process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resetDbForTests, repo } from "../src/store/sqlite.js";
import app from "../src/index.js";
import {
  copyImagesFromSource,
  mapImagesToProducts,
  publicImageUrl,
  saveProductImageForName,
} from "../src/services/productImages.js";

async function withServer(fn) {
  const imagesDir = fs.mkdtempSync(path.join(os.tmpdir(), "sp-images-"));
  process.env.PRODUCT_IMAGES_DIR = imagesDir;
  resetDbForTests();
  const { getDb } = await import("../src/store/sqlite.js");
  getDb();
  const server = app.listen(0);
  const { port } = server.address();
  try {
    await fn(port, imagesDir);
  } finally {
    server.close();
    delete process.env.PRODUCT_IMAGES_DIR;
    fs.rmSync(imagesDir, { recursive: true, force: true });
  }
}

async function login(port, role = "Designer") {
  const res = await fetch(`http://127.0.0.1:${port}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "designer@shelfpilot.local", password: "password", role }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  return body.token;
}

test("product image upload and map by product name", async () => {
  await withServer(async (port, imagesDir) => {
    repo.upsertCategory({
      id: "cat-test",
      name: "Test",
      vertical: "retail",
      parentId: null,
      color: "#000",
    });
    repo.upsertProduct({
      id: "prd-test",
      name: "Roma Tomato",
      sku: "TOM-1",
      categoryId: "cat-test",
      attributes: { widthMeters: 0.1, heightMeters: 0.1 },
    });

    const token = await login(port);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    saveProductImageForName(png, "Roma Tomato", ".png");

    const mapRes = await fetch(`http://127.0.0.1:${port}/catalog/product-images/map`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const mapped = await mapRes.json();
    assert.equal(mapRes.status, 200);
    assert.equal(mapped.mapped, 1);

    const product = repo.listProducts().find((p) => p.id === "prd-test");
    assert.equal(product.attributes.imageUrl, publicImageUrl("Roma Tomato.png"));

    const imgRes = await fetch(`http://127.0.0.1:${port}${product.attributes.imageUrl}`);
    assert.equal(imgRes.status, 200);

    assert.ok(fs.existsSync(path.join(imagesDir, "Roma Tomato.png")));
  });
});

test("sync copies source folder and maps products", async () => {
  await withServer(async (port, imagesDir) => {
    const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), "sp-src-"));
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    fs.writeFileSync(path.join(sourceDir, "Sample Product.png"), png);

    repo.upsertCategory({
      id: "cat-test",
      name: "Test",
      vertical: "retail",
      parentId: null,
      color: "#000",
    });
    repo.upsertProduct({
      id: "prd-sample",
      name: "Sample Product",
      sku: "S-1",
      categoryId: "cat-test",
      attributes: {},
    });

    const copied = copyImagesFromSource(sourceDir, imagesDir);
    assert.equal(copied, 1);
    const result = mapImagesToProducts(repo.listProducts(), (p) => repo.upsertProduct(p));
    assert.equal(result.mapped, 1);

    fs.rmSync(sourceDir, { recursive: true, force: true });
  });
});
