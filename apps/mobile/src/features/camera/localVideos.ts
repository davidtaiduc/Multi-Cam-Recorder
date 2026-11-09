import {Directory, File, Paths} from 'expo-file-system';
import {ImageManipulator, SaveFormat} from 'expo-image-manipulator';
import {createVideoPlayer} from 'expo-video';
import {inspectVideoContainer, recordingStem} from './videoContainer';

const videoDirectory = () => new Directory(Paths.document, 'recordings');
const localClipName = /^\d{4}-.*__local-test__[\da-f-]{36}\.(mp4|mov)$/i;

export function thumbnailFor(file: File) {
  return new File(videoDirectory(), file.name.replace(/\.(mp4|mov)$/i, '.jpg'));
}

export function listLocalVideos() {
  const directory = videoDirectory();
  if (!directory.exists) return [];
  return directory.list()
    .filter((entry): entry is File => entry instanceof File && localClipName.test(entry.name) && entry.size > 0)
    .sort((left, right) => right.name.localeCompare(left.name));
}

export async function saveLocalVideo(uri: string, recordedAt: Date, cameraName: string, localVideoUid: string) {
  const source = new File(uri);
  const size = source.size;
  if (!source.exists || size <= 0) throw Error('Camera chưa tạo được tệp video.');
  const handle = source.open();
  const format = await (async () => {
    try {
      return await inspectVideoContainer(size, (offset, length) => {
        handle.offset = offset;
        return handle.readBytes(length);
      });
    } finally {
      handle.close();
    }
  })();

  const directory = videoDirectory();
  directory.create({intermediates: true, idempotent: true});
  const file = new File(directory, `${recordingStem(recordedAt, cameraName, localVideoUid)}.${format.extension}`);
  await source.move(file);
  if (!file.exists || file.size !== size) throw Error('Không xác nhận được tệp video tại thư mục đích.');
  return {file, ...format};
}

export async function createLocalThumbnail(file: File) {
  const player = createVideoPlayer(null);
  try {
    await player.replaceAsync(file.uri);
    const [thumbnail] = await player.generateThumbnailsAsync(0, {maxWidth: 480});
    if (!thumbnail) throw Error('Không trích được khung hình.');
    try {
      const context = ImageManipulator.manipulate(thumbnail);
      try {
        const image = await context.renderAsync();
        try {
          const {uri} = await image.saveAsync({format: SaveFormat.JPEG, compress: 0.85});
          const destination = thumbnailFor(file);
          await new File(uri).move(destination);
          if (!destination.exists || destination.size <= 0) throw Error('Không lưu được ảnh thu nhỏ.');
        } finally {
          image.release();
        }
      } finally {
        context.release();
      }
    } finally {
      thumbnail.release();
    }
  } finally {
    player.release();
  }
}
