import {useEffect, useRef, useState} from 'react';
import {AppState, BackHandler, Button, Image, Linking, Platform, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CameraView, useCameraPermissions, useMicrophonePermissions} from 'expo-camera';
import type {CameraType} from 'expo-camera';
import {randomUUID} from 'expo-crypto';
import {useEvent} from 'expo';
import {Paths} from 'expo-file-system';
import type {File} from 'expo-file-system';
import {isAvailableAsync, shareAsync} from 'expo-sharing';
import {useVideoPlayer, VideoView} from 'expo-video';
import {createLocalThumbnail, listLocalVideos, saveLocalVideo, thumbnailFor} from './localVideos';

type Phase = 'idle' | 'starting' | 'recording' | 'stopping' | 'saving';
type Capture = {camera: CameraView; started: boolean; stopRequested: boolean; saving: boolean};
const minFreeBytes = 500_000_000;
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

function ClipPlayback({file, onClose}: {file: File; onClose: () => void}) {
  const player = useVideoPlayer(file.uri);
  const {status, error} = useEvent(player, 'statusChange', {status: player.status});
  const [shareError, setShareError] = useState('');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') player.pause();
    });
    return () => subscription.remove();
  }, [player]);

  async function exportClip() {
    setShareError('');
    try {
      if (!file.exists || !await isAvailableAsync()) throw Error('Không thể chia sẻ clip trên thiết bị này.');
      await shareAsync(file.uri, {mimeType: file.name.endsWith('.mov') ? 'video/quicktime' : 'video/mp4'});
    } catch (cause) {
      setShareError(message(cause));
    }
  }

  return <View style={styles.group}>
    <Text style={styles.heading}>Phát lại clip</Text>
    <VideoView player={player} style={styles.preview} nativeControls contentFit="contain"/>
    {status === 'loading' && <Text>Đang mở clip…</Text>}
    {status === 'error' && <Text style={styles.error}>Không phát được clip. {error?.message}</Text>}
    <Text selectable>{file.name}</Text>
    <Button title="Chia sẻ tệp để kiểm tra" onPress={() => void exportClip()}/>
    {!!shareError && <Text style={styles.error}>{shareError}</Text>}
    <Button title="Đóng phát lại" onPress={onClose}/>
  </View>;
}

export function LocalCameraScreen({cameraName, onBack}: {cameraName: string; onBack: () => void}) {
  const [cameraPermission, requestCamera, readCameraPermission] = useCameraPermissions();
  const [micPermission, requestMic, readMicPermission] = useMicrophonePermissions();
  const camera = useRef<CameraView>(null);
  const capture = useRef<Capture | null>(null);
  const readyRef = useRef(false);
  const mounted = useRef(false);
  const requesting = useRef(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [asking, setAsking] = useState(false);
  const [ready, setReady] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [clips, setClips] = useState<File[]>([]);
  const [selected, setSelected] = useState<File | null>(null);
  const allowed = !!cameraPermission?.granted && !!micPermission?.granted;
  const blocked = !![cameraPermission, micPermission].find(permission => permission && !permission.granted && !permission.canAskAgain);

  function setCameraReady(value: boolean) {
    readyRef.current = value;
    setReady(value);
  }

  useEffect(() => {
    mounted.current = true;
    try { setClips(listLocalVideos()); }
    catch (cause) { setError(`Không đọc được clip đã lưu. ${message(cause)}`); }
    return () => {
      mounted.current = false;
      readyRef.current = false;
      const pending = capture.current;
      if (pending && !pending.saving) pending.camera.stopRecording();
    };
  }, []);

  useEffect(() => {
    let current = true;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void Promise.all([readCameraPermission(), readMicPermission()]).then(() => {
          if (current && AppState.currentState === 'active') setActive(true);
        }).catch(cause => {
          if (current) setError(`Không kiểm tra được quyền truy cập. ${message(cause)}`);
        });
        return;
      }
      setCameraReady(false);
      setActive(false);
      const pending = capture.current;
      if (pending && !pending.saving) {
        pending.stopRequested = true;
        pending.camera.stopRecording();
        setPhase('stopping');
        setNotice('Ứng dụng đã rời màn hình. Đang hoàn tất phần video đã quay.');
      }
    });
    return () => { current = false; subscription.remove(); };
  }, [readCameraPermission, readMicPermission]);

  function stop() {
    const pending = capture.current;
    if (!pending || pending.stopRequested || pending.saving) return;
    pending.stopRequested = true;
    setPhase('stopping');
    // A tap during native startup is applied on the first recording progress event.
    if (pending.started) pending.camera.stopRecording();
  }

  function goBack() {
    if (capture.current) {
      stop();
      setNotice('Đợi clip lưu xong rồi quay lại.');
      return;
    }
    if (selected) { setSelected(null); return; }
    onBack();
  }

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  });

  async function grantPermissions() {
    if (requesting.current) return;
    requesting.current = true;
    setAsking(true);
    setError('');
    try {
      const cameraStatus = cameraPermission?.granted ? cameraPermission : await requestCamera();
      if (mounted.current && cameraStatus.granted && !micPermission?.granted) await requestMic();
    } catch (cause) {
      if (mounted.current) setError(`Không xin được quyền truy cập. ${message(cause)}`);
    } finally {
      requesting.current = false;
      if (mounted.current) setAsking(false);
    }
  }

  async function record() {
    const view = camera.current;
    if (capture.current || !view || !readyRef.current || !allowed || AppState.currentState !== 'active') return;
    setError('');
    setNotice('');
    let pending: Capture | undefined;
    try {
      const free = Paths.availableDiskSpace;
      if (!Number.isFinite(free) || free <= 0) throw Error('Không kiểm tra được dung lượng trống.');
      if (free < minFreeBytes) throw Error(`Chỉ còn ${Math.floor(free / 1_000_000)} MB. Cần ít nhất 500 MB trống để quay.`);
      const recordedAt = new Date();
      const localVideoUid = randomUUID();
      pending = {camera: view, started: false, stopRequested: false, saving: false};
      capture.current = pending;
      setElapsed(0);
      setPhase('starting');
      const result = await view.recordAsync({maxDuration: 60, maxFileSize: 150_000_000, ...(Platform.OS === 'ios' ? {codec: 'avc1' as const} : {})});
      if (!result?.uri) throw Error('Camera không trả về clip. Thử lại và đợi camera bắt đầu quay trước khi dừng.');
      pending.saving = true;
      if (mounted.current) setPhase('saving');
      const {file, extension} = await saveLocalVideo(result.uri, recordedAt, cameraName, localVideoUid);
      let thumbnailSaved = false;
      try {
        await createLocalThumbnail(file);
        thumbnailSaved = true;
      } catch {
        // The verified video remains available even when thumbnail generation fails.
      }
      if (mounted.current) {
        setClips(previous => [file, ...previous]);
        const format = extension === 'mov' ? 'QuickTime (.mov)' : 'MP4';
        setNotice(`Đã lưu clip ${format}.${thumbnailSaved ? '' : ' Chưa tạo được ảnh thu nhỏ.'}`);
      }
    } catch (cause) {
      if (mounted.current) {
        setNotice('');
        setError(message(cause));
      }
    } finally {
      if (pending && capture.current === pending) {
        capture.current = null;
        if (mounted.current) setPhase('idle');
      }
    }
  }

  const busy = phase !== 'idle';
  const duration = `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`;
  const recordingStatus: Record<Phase, string> = {
    idle: ready ? 'Camera sẵn sàng' : 'Đang mở camera…',
    starting: 'Đang bắt đầu quay…', recording: `Đang quay · ${duration}`,
    stopping: 'Đang dừng quay…', saving: 'Đang lưu clip và ảnh thu nhỏ…',
  };

  return <SafeAreaView style={styles.page}>
    <ScrollView contentContainerStyle={styles.content}>
      <Button title="Quay lại" onPress={goBack}/>
      <Text style={styles.title}>Camera Remote</Text>
      <Text>Quay thử cục bộ. Trạng thái phòng và quyền điều khiển giữ nguyên.</Text>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
      {selected ? <ClipPlayback key={selected.uri} file={selected} onClose={() => setSelected(null)}/> : <>
        {!allowed && <View style={styles.group}>
          <Text>Cấp quyền camera để xem hình và quyền micro để thu tiếng.</Text>
          {cameraPermission?.status === 'denied' && <Text style={styles.error}>Bạn đã từ chối quyền camera.</Text>}
          {micPermission?.status === 'denied' && <Text style={styles.error}>Bạn đã từ chối quyền micro.</Text>}
          {blocked
            ? <Button title="Mở Cài đặt" onPress={() => void Linking.openSettings().catch(cause => setError(message(cause)))}/>
            : <Button title={asking ? 'Đang xin quyền…' : 'Cấp hoặc thử lại quyền'} disabled={asking || !cameraPermission || !micPermission} onPress={() => void grantPermissions()}/>}
        </View>}
        {allowed && active && !previewFailed && <CameraView key={facing} ref={camera} style={styles.preview}
          facing={facing} mode="video" mute={false} videoQuality="720p"
          onCameraReady={() => setCameraReady(true)}
          onMountError={event => {
            setCameraReady(false);
            setPreviewFailed(true);
            setError(`Không mở được camera. ${event.message}`);
          }}
          onRecordingProgress={({duration: seconds}) => {
            const pending = capture.current;
            if (!pending || pending.saving) return;
            setElapsed(seconds);
            if (!pending.started) {
              pending.started = true;
              if (pending.stopRequested) pending.camera.stopRecording();
              else setPhase('recording');
            }
          }}/>}
        {allowed && previewFailed && <Button title="Thử mở lại camera" disabled={busy || !active} onPress={() => {
          setError('');
          setPreviewFailed(false);
        }}/>}
        {(busy || allowed && active && !previewFailed) && <Text style={styles.status}>{recordingStatus[phase]}</Text>}
        {allowed && active && !previewFailed && <View style={styles.controls}>
          <Button title={facing === 'back' ? 'Đổi sang camera trước' : 'Đổi sang camera sau'} disabled={busy || !ready} onPress={() => {
            if (capture.current || !readyRef.current) return;
            setCameraReady(false);
            setFacing(facing === 'back' ? 'front' : 'back');
          }}/>
          {busy
            ? <Button title="Dừng quay" disabled={phase === 'stopping' || phase === 'saving'} onPress={stop}/>
            : <Button title="Quay" disabled={!ready} onPress={() => void record()}/>}
        </View>}
        <Text style={styles.heading}>Clip đã lưu trên máy</Text>
        {clips.length === 0 && <Text>Chưa có clip.</Text>}
        {clips.map(file => {
          const thumbnail = thumbnailFor(file);
          return <View key={file.uri} style={styles.clip}>
            {thumbnail.exists && thumbnail.size > 0
              ? <Image source={{uri: thumbnail.uri}} style={styles.thumbnail} accessibilityLabel="Ảnh thu nhỏ của clip"/>
              : <Text>Chưa có ảnh thu nhỏ</Text>}
            <Text selectable>{file.name}</Text>
            <Button title="Mở clip" disabled={busy} onPress={() => {
              if (capture.current) return;
              if (!file.exists) { setError('Tệp video không còn trên thiết bị.'); return; }
              setCameraReady(false);
              setSelected(file);
            }}/>
          </View>;
        })}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: '#eef2f6'},
  content: {padding: 20, paddingBottom: 40, gap: 16},
  title: {fontSize: 28, fontWeight: '700', color: '#126858'},
  heading: {fontSize: 19, fontWeight: '700', color: '#163c34'},
  preview: {width: '100%', height: 320, backgroundColor: '#172d35', borderRadius: 12, overflow: 'hidden'},
  group: {gap: 12}, controls: {gap: 8}, status: {fontWeight: '600', textAlign: 'center'},
  error: {color: '#a32a25'}, notice: {color: '#126858'},
  clip: {padding: 12, gap: 8, backgroundColor: '#fff', borderRadius: 12},
  thumbnail: {width: 120, height: 80, borderRadius: 8, resizeMode: 'cover'},
});
