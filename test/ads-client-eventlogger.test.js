const PLC_PROJECT_VERSION = "1.0.0.0";
const ads = require("../src/ads-client");
const AMS_NET_ID = (process.env["ADS_CLIENT_TEST_AMS"] ?? "localhost").trim();

const client = new ads.Client({
  targetAmsNetId: AMS_NET_ID,
  targetAdsPort: 851, // (ads-client-ads.js) ADS_RESERVED_PORTS.EventLogPublisher 132
  bareClient: true, // needed to connect to EventLogPublisher via ADS port 132
});

/**
 * Converts msgType to array of message types
 * @param {number} msgTypeMask
 * @returns
 */
const convertMsgType = (msgTypeMask) => {
  let strs = [];

  if ((msgTypeMask & 0x1) == 0x1) strs.push("hint");
  if ((msgTypeMask & 0x2) == 0x2) strs.push("warning");
  if ((msgTypeMask & 0x4) == 0x4) strs.push("error");
  if ((msgTypeMask & 0x10) == 0x10) strs.push("log");
  if ((msgTypeMask & 0x20) == 0x20) strs.push("msgbox");
  if ((msgTypeMask & 0x40) == 0x40) strs.push("resource");
  if ((msgTypeMask & 0x80) == 0x80) strs.push("string");

  return strs;
};

const long = require("long");

/**
 * Unpacks received TwinCAT Logger entry to object
 * @param {Buffer} data
 * @returns
 */
const unpackTwinCatLoggerEntry = (data) => {
  let pos = 0;
  const row = {};
  const _unknown = {};

  //0..7 - timestamp
  row.timestamp = new Date(
    new long(data.readUInt32LE(pos), data.readUInt32LE(pos + 4))
      .div(10000)
      .sub(11644473600000)
      .toNumber()
  );
  pos += 8;

  //8 - message type
  row.msgTypeMask = data.readUint8(pos);
  row.msgTypes = convertMsgType(row.msgTypeMask);
  pos += 1;

  //9 - unknown byte
  _unknown.byte_9 = data.readUint8(pos);
  pos += 1;

  //10 - unknown byte
  _unknown.byte_10 = data.readUint8(pos);
  pos += 1;

  //11 - unknown byte
  _unknown.byte_11 = data.readUint8(pos);
  pos += 1;

  //12..13 - sender ADS port
  row.senderAdsPort = data.readUint16LE(pos);
  pos += 2;

  //14 - unknown byte
  _unknown.byte_14 = data.readUint8(pos);
  pos += 1;

  //15 - unknown byte
  _unknown.byte_15 = data.readUint8(pos);
  pos += 1;

  //16..n - sender and payload string
  //There are also few bytes of unknown data between sender and msg, not handled here
  let str = data.slice(pos).toString().slice(0, -1);

  //Sender is from start of string until \0
  row.sender = str.substr(0, str.indexOf("\0"));

  //Message is from end until \0
  row.msg = str.substr(str.lastIndexOf("\0") + 1);

  //Uncomment to add unknown bytes to object
  //row._unknown = _unknown;

  //Uncomment to add raw data to object
  //row._raw = data;

  return row;
};

describe("connection", () => {
  test("client is not connected at beginning", () => {
    expect(client.connection.connected).toBe(false);
  });

  test("checking ads client settings", async () => {
    expect(client).toBeInstanceOf(ads.Client);
    expect(client).toHaveProperty("settings");
    expect(client.settings.targetAmsNetId).toBe(
      AMS_NET_ID === "localhost" ? "127.0.0.1.1.1" : AMS_NET_ID
    );
    expect(client.settings.targetAdsPort).toBe(851);
  });

  test("connecting to localhost and 851", async () => {
    try {
      const res = await client.connect();

      // DAVID **************************************************

      let now = new Date();
      let timestamp = now.getTime(); // This will give you the timestamp in milliseconds
      let buffer = Buffer.from(timestamp.toString(16), "hex"); // Convert the timestamp to hexadecimal and then to a buffer
      console.log(timestamp, buffer);

      // ********************************************************

      const unknownFirstBuffer = Buffer.alloc(20);
      // 01 00 00 00 c8 00 00 00 04 00 00 00 e8 03 00 00 c0 08 01 73

      unknownFirstBuffer.writeUintLE(0x01, 0, 1);
      unknownFirstBuffer.writeUintLE(0xc8, 4, 1);
      unknownFirstBuffer.writeUintLE(0x04, 8, 1);
      unknownFirstBuffer.writeUintLE(0xe8, 12, 1);
      unknownFirstBuffer.writeUintLE(0x03, 13, 1);
      unknownFirstBuffer.writeUintLE(0xc0, 16, 1);
      unknownFirstBuffer.writeUintLE(0x08, 17, 1);
      unknownFirstBuffer.writeUintLE(0x01, 18, 1);
      unknownFirstBuffer.writeUintLE(0x73, 19, 1);

      const readUnknownFirstBuffer = await client.readWriteRaw(
        0x000000c8, // indexGroup
        0x00000002, // indexOffset
        1024020, // readLength
        unknownFirstBuffer, // dataBuffer
        132 // targetAdsPort
      );

      console.log(
        readUnknownFirstBuffer,
        readUnknownFirstBuffer.toString("hex")
      );
      console.log(readUnknownFirstBuffer.toString());

      // ********************************************************

      const eventClassNameBuffer = Buffer.alloc(40);
      // 01 00 00 00 66 00 00 00 18 00 00 00 00 00 d7 44 10 04 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 80 40

      eventClassNameBuffer.writeUintLE(0x01, 0, 1);
      eventClassNameBuffer.writeUintLE(0x66, 4, 1);
      eventClassNameBuffer.writeUintLE(0x18, 8, 1);
      eventClassNameBuffer.writeUintLE(0xd7, 14, 1);
      eventClassNameBuffer.writeUintLE(0x44, 15, 1);
      eventClassNameBuffer.writeUintLE(0x10, 16, 1);
      eventClassNameBuffer.writeUintLE(0x04, 17, 1);
      eventClassNameBuffer.writeUintLE(0x80, 38, 1);
      eventClassNameBuffer.writeUintLE(0x40, 39, 1);

      const readEventClassNameBuffer = await client.readWriteRaw(
        0x000001f4, // indexGroup
        0x00000000, // indexOffset
        2064, // readLength
        eventClassNameBuffer, // dataBuffer
        132 // targetAdsPort
      );

      console.log(
        readEventClassNameBuffer,
        readEventClassNameBuffer.toString("hex")
      );
      console.log(readEventClassNameBuffer.toString());

      // ********************************************************

      const eventTextAndIdBuffer = Buffer.alloc(68);
      // 01 00 00 00 64 00 00 00 34 00 00 00 00 00 00 00 10 04 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 7b 00 00 00 00 00 00 00 00 00 00 00 34 00 00 00 00 00 00 00 34 00 00 00 00 00 00 00 00 00 00 00

      eventTextAndIdBuffer.writeUintLE(0x01, 0, 1);
      eventTextAndIdBuffer.writeUintLE(0x64, 4, 1);
      eventTextAndIdBuffer.writeUintLE(0x34, 8, 1);
      eventTextAndIdBuffer.writeUintLE(0x10, 16, 1);
      eventTextAndIdBuffer.writeUintLE(0x04, 17, 1);
      eventTextAndIdBuffer.writeUintLE(0x7b, 36, 1);
      eventTextAndIdBuffer.writeUintLE(0x34, 48, 1);
      eventTextAndIdBuffer.writeUintLE(0x34, 56, 1);

      const readEventTextAndIdBuffer = await client.readWriteRaw(
        0x000001f4, // indexGroup
        0x00000000, // indexOffset
        2064, // readLength
        eventTextAndIdBuffer, // dataBuffer
        132 // targetAdsPort
      );

      console.log(
        readEventTextAndIdBuffer,
        readEventTextAndIdBuffer.toString("hex")
      );
      console.log(readEventTextAndIdBuffer.toString());

      // ********************************************************

      const fourthBuffer = Buffer.alloc(8);
      // c0 a8 01 73 01 01 46 81
      // (dec 192.168.1.115.1.1 70 129)

      fourthBuffer.writeUintLE(0xc0, 0, 1);
      fourthBuffer.writeUintLE(0xa8, 1, 1);
      fourthBuffer.writeUintLE(0x01, 2, 1);
      fourthBuffer.writeUintLE(0x73, 3, 1);
      fourthBuffer.writeUintLE(0x01, 4, 1);
      fourthBuffer.writeUintLE(0x01, 5, 1);
      fourthBuffer.writeUintLE(0x46, 6, 1);
      fourthBuffer.writeUintLE(0x81, 7, 1);

      const readFourthBuffer = await client.readWriteRaw(
        0x0000f090, // indexGroup
        0x00000000, // indexOffset
        4, // readLength
        fourthBuffer, // dataBuffer
        100 // targetAdsPort
      );

      console.log(readFourthBuffer, readFourthBuffer.toString("hex"));
      console.log(readFourthBuffer.toString());

      // ********************************************************

      const unknownFifthBuffer = Buffer.alloc(44);
      // 55 cd 10 00 02 00 14 00 e0 fd 0f 8e 18 00 00 00 00 00 00 00 81 01 94 00 11 84 80 00 db fe 0f 8e 18 84 80 00 01 00 01 00 19 02 01 00

      unknownFifthBuffer.writeUintLE(0x55, 0, 1);
      unknownFifthBuffer.writeUintLE(0xcd, 1, 1);
      unknownFifthBuffer.writeUintLE(0x10, 2, 1);
      unknownFifthBuffer.writeUintLE(0x02, 4, 1);
      unknownFifthBuffer.writeUintLE(0x14, 6, 1);
      unknownFifthBuffer.writeUintLE(0xe0, 8, 1);
      unknownFifthBuffer.writeUintLE(0xfd, 9, 1);
      unknownFifthBuffer.writeUintLE(0x0f, 10, 1);
      unknownFifthBuffer.writeUintLE(0x8e, 11, 1);
      unknownFifthBuffer.writeUintLE(0x18, 12, 1);
      unknownFifthBuffer.writeUintLE(0x81, 20, 1);
      unknownFifthBuffer.writeUintLE(0x01, 21, 1);
      unknownFifthBuffer.writeUintLE(0x94, 22, 1);
      unknownFifthBuffer.writeUintLE(0x11, 24, 1);
      unknownFifthBuffer.writeUintLE(0x84, 25, 1);
      unknownFifthBuffer.writeUintLE(0x80, 26, 1);
      unknownFifthBuffer.writeUintLE(0xdb, 28, 1);
      unknownFifthBuffer.writeUintLE(0xfe, 29, 1);
      unknownFifthBuffer.writeUintLE(0x0f, 30, 1);
      unknownFifthBuffer.writeUintLE(0x8e, 31, 1);
      unknownFifthBuffer.writeUintLE(0x18, 32, 1);
      unknownFifthBuffer.writeUintLE(0x84, 33, 1);
      unknownFifthBuffer.writeUintLE(0x80, 34, 1);
      unknownFifthBuffer.writeUintLE(0x01, 36, 1);
      unknownFifthBuffer.writeUintLE(0x01, 38, 1);
      unknownFifthBuffer.writeUintLE(0x19, 40, 1);
      unknownFifthBuffer.writeUintLE(0x02, 41, 1);
      unknownFifthBuffer.writeUintLE(0x01, 42, 1);

      const readUnknownFifthBuffer = await client.readWriteRaw(
        0x0000002a, // indexGroup
        0x0000002a, // indexOffset
        65536, // readLength
        unknownFifthBuffer, // dataBuffer
        851 // targetAdsPort
      );

      console.log(
        readUnknownFifthBuffer,
        readUnknownFifthBuffer.toString("hex")
      );
      console.log(readUnknownFifthBuffer.toString());

      // ********************************************************

      const unknownSixthBuffer = Buffer.alloc(44);
      // 55 cd 10 00 02 00 14 00 e0 fd 0f 8e 18 00 00 00 00 00 00 00 81 01 94 00 11 84 80 00 db fe 0f 8e 18 84 80 00 01 00 01 00 19 02 01 00

      unknownSixthBuffer.writeUintLE(0x55, 0, 1);
      unknownSixthBuffer.writeUintLE(0xcd, 1, 1);
      unknownSixthBuffer.writeUintLE(0x10, 2, 1);
      unknownSixthBuffer.writeUintLE(0x02, 4, 1);
      unknownSixthBuffer.writeUintLE(0x14, 6, 1);
      unknownSixthBuffer.writeUintLE(0xe0, 8, 1);
      unknownSixthBuffer.writeUintLE(0xfd, 9, 1);
      unknownSixthBuffer.writeUintLE(0x0f, 10, 1);
      unknownSixthBuffer.writeUintLE(0x8e, 11, 1);
      unknownSixthBuffer.writeUintLE(0x18, 12, 1);
      unknownSixthBuffer.writeUintLE(0x81, 20, 1);
      unknownSixthBuffer.writeUintLE(0x01, 21, 1);
      unknownSixthBuffer.writeUintLE(0x94, 22, 1);
      unknownSixthBuffer.writeUintLE(0x11, 24, 1);
      unknownSixthBuffer.writeUintLE(0x84, 25, 1);
      unknownSixthBuffer.writeUintLE(0x80, 26, 1);
      unknownSixthBuffer.writeUintLE(0xdb, 28, 1);
      unknownSixthBuffer.writeUintLE(0xfe, 29, 1);
      unknownSixthBuffer.writeUintLE(0x0f, 30, 1);
      unknownSixthBuffer.writeUintLE(0x8e, 31, 1);
      unknownSixthBuffer.writeUintLE(0x18, 32, 1);
      unknownSixthBuffer.writeUintLE(0x84, 33, 1);
      unknownSixthBuffer.writeUintLE(0x80, 34, 1);
      unknownSixthBuffer.writeUintLE(0x01, 36, 1);
      unknownSixthBuffer.writeUintLE(0x01, 38, 1);
      unknownSixthBuffer.writeUintLE(0x19, 40, 1);
      unknownSixthBuffer.writeUintLE(0x02, 41, 1);
      unknownSixthBuffer.writeUintLE(0x01, 42, 1);

      const readUnknownSixthBuffer = await client.readWriteRaw(
        0x0000002a, // indexGroup
        0x0000002a, // indexOffset
        65536, // readLength
        unknownSixthBuffer, // dataBuffer
        851 // targetAdsPort
      );

      console.log(
        readUnknownSixthBuffer,
        readUnknownSixthBuffer.toString("hex")
      );
      console.log(readUnknownSixthBuffer.toString());

      // DAVID **************************************************

      //   expect(res).toHaveProperty("connected");
      //   expect(res.connected).toBe(true);
    } catch (err) {
      throw new Error(`connecting localhost failed (${err.message}`, err);
    }
  });

  //   test("checking that test PLC project is active", async () => {
  //     try {
  //       const res = await client.readSymbol("GVL_AdsClientTests.IsTestProject");
  //       //console.log(res)
  //       expect(res).toHaveProperty("value");

  //       expect(res.value).toBe(true);
  //     } catch (err) {
  //       throw new Error(
  //         "Failed to check for test PLC project - is correct PLC project active?"
  //       );
  //     }
  //   });
});

describe("finalizing", () => {
  test("disconnecting", async () => {
    if (client?.connection.connected) {
      const task = client.disconnect();

      expect(task).resolves.toBeUndefined();
    }
  });
});
