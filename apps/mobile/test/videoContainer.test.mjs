import assert from 'node:assert/strict';
import {test} from 'node:test';
import {inspectVideoContainer, recordingStem} from '../src/features/camera/videoContainer.ts';

function box(type, payload) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + payload.length);
  header.write(type, 4, 4, 'ascii');
  return Buffer.concat([header, payload]);
}

function sample(brand, fragmented = false) {
  return Buffer.concat([
    box('ftyp', Buffer.concat([Buffer.from(brand), Buffer.alloc(4)])),
    box('moov', Buffer.from([1])),
    ...(fragmented ? [box('moof', Buffer.from([1]))] : []),
    box('mdat', Buffer.from([1, 2, 3])),
  ]);
}

const inspect = buffer => inspectVideoContainer(buffer.length, async (offset, length) => buffer.subarray(offset, offset + length));

test('selects extension from file bytes and distinguishes movie fragments', async () => {
  assert.deepEqual(await inspect(sample('qt  ')), {extension: 'mov', hasMovieFragments: false});
  assert.deepEqual(await inspect(sample('mp42', true)), {extension: 'mp4', hasMovieFragments: true});
});

test('rejects truncated files and unrecognized container brands', async () => {
  await assert.rejects(inspect(sample('mp42').subarray(0, -1)), /không hợp lệ/);
  await assert.rejects(inspect(sample('heic')), /Không nhận dạng/);
});

test('camera labels cannot inject paths or extra filename delimiters', () => {
  const time = new Date('2026-11-09T12:34:56.789Z');
  const uid = '1c479221-9a21-455a-b5a1-3f083132460e';
  assert.equal(recordingStem(time, '../Đằng trước: "A"__', uid), `2026-11-09T12-34-56-789Z__Dang-truoc-A__local-test__${uid}`);
});
