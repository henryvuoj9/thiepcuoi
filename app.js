/**
 * Điểm khởi động Passenger gọi tới trên cPanel.
 * Passenger chặn lời gọi listen() nên cổng ở đây chỉ dùng khi chạy máy cục bộ.
 */
"use strict";

const { loadEnv } = require("./src/config");
loadEnv();

const { createApp } = require("./src/server");

const port = process.env.PORT || 3000;
createApp().listen(port, () => {
  console.log(`Thiệp cưới đang chạy tại http://localhost:${port}`);
});
