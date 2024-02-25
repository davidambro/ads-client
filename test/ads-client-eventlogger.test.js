const PLC_PROJECT_VERSION = "1.0.0.0";
const ads = require("../src/ads-client");
const AMS_NET_ID = (process.env["ADS_CLIENT_TEST_AMS"] ?? "localhost").trim();

const client = new ads.Client({
  targetAmsNetId: AMS_NET_ID,
  targetAdsPort: 110, // (ads-client-ads.js) ADS_RESERVED_PORTS.EventLog
  bareClient: true, // needed to connect to eventlogger via ADS port 110
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
    expect(client.settings.targetAdsPort).toBe(110);
  });

  test("connecting to localhost and 110", async () => {
    try {
      const res = await client.connect();

      // DAVID **************************************************

      const buffer1 = Buffer.alloc(2064); // 40 bytes indicati in wireshark ma va in errore la funzione readWriteRaw

      // 01 00 00 00 66 00 00 00 18 00 00 00 00 00 d7 44 10 04 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 80 40

      buffer1.writeUintLE(0x01, 0, 1);
      buffer1.writeUintLE(0x66, 4, 1);
      buffer1.writeUintLE(0x18, 8, 1);
      buffer1.writeUintLE(0xd7, 14, 1);
      buffer1.writeUintLE(0x44, 15, 1);
      buffer1.writeUintLE(0x10, 16, 1);
      buffer1.writeUintLE(0x04, 17, 1);
      buffer1.writeUintLE(0x80, 38, 1);
      buffer1.writeUintLE(0x40, 39, 1);

      const readBuffer1 = await client.readWriteRaw(
        0x01f4, // indexGroup
        0, // indexOffset
        2064, // readLength
        buffer1, // dataBuffer
        110 // targetAdsPort
      );
      console.log(readBuffer1);

      //   const buffer1Length = Buffer.byteLength(readBuffer1);
      //   console.log(buffer1Length);

      const buffer2 = Buffer.alloc(2064); // 68 bytes indicati in wireshark ma va in errore la funzione readWriteRaw

      // 01 00 00 00 64 00 00 00 34 00 00 00 00 00 00 00 10 04 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 7b 00 00 00 00 00 00 00 00 00 00 00 34 00 00 00 00 00 00 00 34 00 00 00 00 00 00 00 00 00 00 00

      buffer2.writeUintLE(0x01, 0, 1);
      buffer2.writeUintLE(0x66, 4, 1);
      buffer2.writeUintLE(0x34, 8, 1);
      buffer2.writeUintLE(0x10, 16, 1);
      buffer2.writeUintLE(0x04, 17, 1);
      buffer2.writeUintLE(0x7b, 36, 1);
      buffer2.writeUintLE(0x34, 48, 1);
      buffer2.writeUintLE(0x34, 56, 1);

      const readBuffer2 = await client.readWriteRaw(
        0x01f4, // indexGroup
        0, // indexOffset
        2064, // readLength
        buffer2, // dataBuffer
        110 // targetAdsPort
      );
      console.log(readBuffer2);

      // merge the two buffers
      const mergedBuffer = Buffer.concat([readBuffer1, readBuffer2]);
      console.log(mergedBuffer);
      console.log(unpackTwinCatLoggerEntry(mergedBuffer));

      /*
        {
            timestamp: 1703-07-31T09:53:44.958Z,
            msgTypeMask: 97,
            msgTypes: [ 'hint', 'msgbox', 'resource' ],
            senderAdsPort: 101,
            sender: 't',
            msg: ''
          }
        */

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
