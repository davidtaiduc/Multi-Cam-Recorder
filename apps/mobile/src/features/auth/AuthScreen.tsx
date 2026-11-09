import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import type {TextInputProps} from 'react-native';
import type {OtpData} from '@multicam/contracts';
import {ApiError, createApi, errorText} from '@multicam/contracts/client';

type Props = {
  ready: boolean;
  api: ReturnType<typeof createApi>['call'];
  onLogin: (email: string, password: string) => Promise<void>;
};
type Screen = 'login' | 'signup' | 'verify';

function Field({label, ...props}: TextInputProps & {label: string}) {
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput placeholderTextColor="#79838e" {...props} style={s.input}/>
  </View>;
}

export function AuthScreen({ready, api, onLogin}: Props) {
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [devCode, setDevCode] = useState('');
  const [remaining, setRemaining] = useState(0);
  const disabled = busy || !ready;
  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  function navigate(next: Screen) {
    setScreen(next);
    setError('');
    setNotice('');
    setOtp('');
    setDevCode('');
    setVisible(false);
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try { await task(); }
    catch (e) {
      setError(errorText(e));
      if (e instanceof ApiError && e.code === 'OTP_COOLDOWN') setRemaining(120);
      if (e instanceof ApiError && e.code === 'VERIFICATION_REQUIRED') setScreen('verify');
    }
    finally { setBusy(false); }
  }

  function validateEmail() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) throw Error('Vui lòng nhập địa chỉ email hợp lệ.');
  }

  async function sendOtp() {
    validateEmail();
    const data = await api<OtpData>('/auth/otp', {email: normalizedEmail, purpose: 'signup'});
    setRemaining(data.resend_after);
    setDevCode(data.dev_code || '');
    setNotice(data.dev_code ? 'Chế độ thử nghiệm: dùng mã bên dưới để xác thực.' : 'Mã xác thực đã được gửi qua dịch vụ email/SMS đã cấu hình.');
  }

  const emailField = <Field label="Email" placeholder="ban@example.com" value={email}
    onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
    autoCorrect={false} autoComplete="email" editable={!disabled}/>;

  return <View style={s.card}>
    {screen !== 'verify' ? <View style={s.tabs}>
      {(['login', 'signup'] as const).map(tab => <Pressable key={tab} disabled={disabled}
        accessibilityRole="tab" accessibilityState={{selected: screen === tab, disabled}}
        onPress={() => navigate(tab)} style={[s.tab, screen === tab && s.selectedTab]}>
        <Text style={[s.tabText, screen === tab && s.selectedText]}>{tab === 'login' ? 'Đăng nhập' : 'Đăng ký'}</Text>
      </Pressable>)}
    </View> : <Text style={s.step}>BƯỚC 2 / 2 · XÁC THỰC EMAIL</Text>}

    <Text style={s.heading}>{screen === 'signup' ? 'Tạo tài khoản Remote' : screen === 'verify' ? 'Xác thực tài khoản' : 'Chào mừng trở lại'}</Text>
    <Text style={s.description}>{screen === 'signup'
      ? 'Tạo tài khoản để kết nối điện thoại với phòng quay. Sau đó xác thực email bằng mã OTP.'
      : screen === 'verify' ? `Nhập mã 6 số cho ${normalizedEmail}. Mã có hiệu lực trong 5 phút.`
      : 'Đăng nhập để tham gia phòng và quản lý kết nối của điện thoại.'}</Text>

    {screen === 'signup' && <>
      <Text style={s.section}>THÔNG TIN CÁ NHÂN</Text>
      <Field label="Họ" placeholder="Nguyễn" value={last} onChangeText={setLast} maxLength={80} autoComplete="family-name" editable={!disabled}/>
      <Field label="Tên" placeholder="Minh Anh" value={first} onChangeText={setFirst} maxLength={80} autoComplete="given-name" editable={!disabled}/>
      <Field label="Số điện thoại" placeholder="0912 345 678" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={24} autoComplete="tel" editable={!disabled}/>
      <Text style={s.section}>THÔNG TIN ĐĂNG NHẬP</Text>
    </>}
    {screen !== 'verify' && <>
      {emailField}
      <Field label="Mật khẩu" placeholder={screen === 'signup' ? 'Từ 6 đến 128 ký tự' : 'Nhập mật khẩu của bạn'} value={password}
        onChangeText={setPassword} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false}
        autoComplete={screen === 'signup' ? 'new-password' : 'current-password'} editable={!disabled}/>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={() => setVisible(!visible)}>
        <Text style={s.link}>{visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</Text>
      </Pressable>
      {screen === 'signup' && <Field label="Nhập lại mật khẩu" placeholder="Nhập lại để xác nhận" value={confirm}
        onChangeText={setConfirm} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!disabled}/>}
    </>}
    {screen === 'verify' && <>
      <Field label="Mã xác thực OTP" placeholder="6 chữ số" value={otp} onChangeText={value => setOtp(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" editable={!disabled}/>
      {!!devCode && <View style={s.devBox}><Text style={s.label}>MÃ THỬ NGHIỆM · DEV</Text><Text selectable style={s.devCode}>{devCode}</Text></View>}
    </>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
    {!!error && <View accessibilityRole="alert" style={s.errorBox}><Text style={s.error}>{error}</Text></View>}

    <Pressable accessibilityRole="button" disabled={disabled || screen === 'verify' && otp.length !== 6}
      style={({pressed}) => [s.primary, (disabled || screen === 'verify' && otp.length !== 6) && s.disabled, pressed && s.pressed]}
      onPress={() => void run(async () => {
        validateEmail();
        if (screen === 'login') {
          if (!password) throw Error('Vui lòng nhập mật khẩu.');
          await onLogin(normalizedEmail, password);
        } else if (screen === 'signup') {
          if (!last.trim() || !first.trim()) throw Error('Vui lòng nhập đầy đủ họ và tên.');
          if (!/^\+?[0-9 ()-]{7,24}$/.test(phone.trim())) throw Error('Vui lòng nhập số điện thoại hợp lệ.');
          if (password.length < 6 || password.length > 128) throw Error('Mật khẩu cần từ 6 đến 128 ký tự.');
          if (password !== confirm) throw Error('Mật khẩu nhập lại chưa khớp.');
          await api('/auth/signup', {email: normalizedEmail, password, first_name: first.trim(), last_name: last.trim(), phone: phone.trim()});
          setScreen('verify');
          setConfirm('');
          setOtp('');
          setDevCode('');
          setRemaining(0);
          // Account creation succeeded even if delivery fails: stay on verification
          // so the user can retry delivery without repeating signup.
          await sendOtp();
        } else {
          await api('/auth/verify', {email: normalizedEmail, code: otp});
          navigate('login');
          setPassword('');
          setConfirm('');
          setNotice('Xác thực thành công. Đăng nhập để tham gia phòng.');
        }
      })}>
      {busy ? <ActivityIndicator color="white"/> : <Text style={s.primaryText}>{screen === 'signup' ? 'Tạo tài khoản & tiếp tục' : screen === 'verify' ? 'Xác thực tài khoản' : 'Đăng nhập'}</Text>}
    </Pressable>
    {screen === 'verify' ? <>
      <Pressable accessibilityRole="button" disabled={disabled || remaining > 0} onPress={() => void run(sendOtp)}>
        <Text style={[s.centerLink, remaining > 0 && s.muted]}>{remaining > 0 ? `Gửi lại mã sau ${remaining}s` : 'Gửi / gửi lại mã xác thực'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={() => navigate('login')}><Text style={s.centerLink}>Quay lại đăng nhập</Text></Pressable>
    </> : screen === 'login' ? <Pressable accessibilityRole="button" disabled={disabled} onPress={() => {
      try { validateEmail(); navigate('verify'); } catch { setError('Nhập email đã đăng ký trước khi xác thực tài khoản.'); }
    }}><Text style={s.centerLink}>Đã đăng ký nhưng chưa xác thực?</Text></Pressable>
      : <Text style={s.footer}>Tất cả trường đều bắt buộc. Tài khoản được tạo với vai trò Remote.</Text>}
  </View>;
}

const s = StyleSheet.create({
  card: {backgroundColor: 'white', borderRadius: 20, padding: 22, gap: 16, borderWidth: 1, borderColor: '#dce5e9'},
  tabs: {flexDirection: 'row', backgroundColor: '#edf2f4', padding: 4, borderRadius: 12, marginBottom: 4},
  tab: {flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 9},
  selectedTab: {backgroundColor: '#126858'}, tabText: {fontWeight: '600', color: '#53636b'}, selectedText: {color: 'white'},
  heading: {fontSize: 25, fontWeight: '700', color: '#163c34'}, description: {fontSize: 15, lineHeight: 23, color: '#52636c'},
  step: {fontSize: 12, fontWeight: '700', color: '#126858', letterSpacing: 1},
  section: {fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#647780', marginTop: 8},
  field: {gap: 8}, label: {fontSize: 14, fontWeight: '600', color: '#30464d'},
  input: {minHeight: 50, borderRadius: 10, borderWidth: 1, borderColor: '#bdccd2', paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#172d35', backgroundColor: '#fbfcfd'},
  link: {color: '#126858', fontWeight: '600', alignSelf: 'flex-end', paddingVertical: 4},
  centerLink: {color: '#126858', textAlign: 'center', fontWeight: '600', paddingVertical: 8},
  primary: {minHeight: 52, borderRadius: 12, backgroundColor: '#126858', justifyContent: 'center', alignItems: 'center', padding: 14, marginTop: 4},
  primaryText: {color: 'white', fontWeight: '700', fontSize: 16}, disabled: {opacity: 0.45}, pressed: {opacity: 0.8},
  errorBox: {backgroundColor: '#fff0ef', borderRadius: 10, padding: 12}, error: {color: '#a32a25', lineHeight: 22},
  notice: {color: '#126858', lineHeight: 22}, muted: {color: '#71818a'},
  devBox: {backgroundColor: '#fff5db', padding: 16, gap: 8, borderRadius: 12}, devCode: {fontSize: 28, fontWeight: '700', letterSpacing: 5, color: '#6e5018'},
  footer: {fontSize: 13, lineHeight: 20, color: '#647780', textAlign: 'center'},
});
