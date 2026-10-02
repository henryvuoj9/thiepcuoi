"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

/* config đọc process.env qua getter nên nạp lại module là đủ để thử. */
function freshConfig(env) {
  delete require.cache[require.resolve("../src/config")];
  const saved = {};
  for (const k of Object.keys(env)) {
    saved[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  const { config } = require("../src/config");
  return { config, restore: () => { for (const k of Object.keys(saved)) {
    if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
  } } };
}

test("khoảng trắng thừa quanh giá trị bị gọt bỏ", () => {
  const { config, restore } = freshConfig({
    ADMIN_USER: "  admin \n",
    SITE_URL: " https://vulinh.site/ ",
    DB_HOST: " localhost ",
    DB_USER: " vuliextv_admin ",
    DB_NAME: " vuliextv__thiepcuoi ",
    DB_PASSWORD: " UMWP2VmLb@ZTpth ",
  });

  assert.equal(config.adminUser, "admin");
  assert.equal(config.siteUrl, "https://vulinh.site");
  assert.equal(config.db.host, "localhost");
  assert.equal(config.db.user, "vuliextv_admin");
  assert.equal(config.db.database, "vuliextv__thiepcuoi");
  assert.equal(config.db.password, "UMWP2VmLb@ZTpth");

  restore();
});

test("giá trị toàn khoảng trắng coi như chưa đặt", () => {
  const { config, restore } = freshConfig({ ADMIN_USER: "   ", SITE_URL: "  " });
  assert.equal(config.adminUser, "admin");
  assert.equal(config.siteUrl, "https://vulinh.site");
  restore();
});

test("thiếu biến bắt buộc thì báo rõ tên biến", () => {
  const { config, restore } = freshConfig({ DB_NAME: undefined, DB_USER: "u" });
  assert.throws(() => config.db, /Thiếu biến môi trường DB_NAME/);
  restore();
});
