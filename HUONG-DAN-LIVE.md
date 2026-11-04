# Hướng dẫn lên live TikTok với Sảnh thời trang

Viết cho MacBook chip Apple (M1 trở lên). Chưa ai thử các bước này với một buổi live thật, nên hãy live thử một buổi
ngắn trước (mục 6). Những chỗ chưa thử được ghi rõ.

## 1. Tài khoản TikTok

- Từ 18 tuổi, không vi phạm gần đây, và đủ số người theo dõi TikTok yêu cầu để live. TikTok chỉ nói con số "tùy thị
  trường", không công bố chung; nhiều nơi là 1.000.
- Tài khoản đã xác thực bằng số điện thoại di động Việt Nam. Từ 25/12/2024 (Nghị định 147/2024/NĐ-CP), chỉ tài khoản
  đã xác thực mới được livestream. TikTok sẽ tự nhắc nếu chưa.
- Thử nhanh trên điện thoại: bấm ＋ rồi chọn LIVE. Có mục LIVE là tài khoản live được từ điện thoại. Live từ máy tính
  còn cần quyền dùng LIVE Studio hoặc khóa phát (mục 2).

## 1b. Live lần đầu bằng điện thoại

LIVE Studio chỉ mở khi tài khoản đạt đủ điều kiện. Điều kiện nào chưa đạt thì hiện bằng chữ xám, chẳng hạn "chưa phát
live lần nào". Vì vậy buổi live đầu tiên phải làm bằng app TikTok trên điện thoại:

1. Bấm ＋, vuốt sang LIVE, đặt tiêu đề (ví dụ "Thử live sảnh thời trang"), rồi bấm Phát LIVE. Nói chuyện với người xem
   qua camera, đừng để hình đứng yên.
2. Nhân buổi này thử luôn phần kết nối sảnh, phần chưa từng được thử:
   - trên Mac, chạy `npm start`;
   - trong trang điều khiển, nhập tên kênh rồi bấm Kết nối;
   - nhờ một người bình luận "áo dài", thả tim và bấm Follow;
   - khung xem trước bên phải trang điều khiển phải phản ứng sau vài giây, mục Nhật ký ghi lại từng việc. Khung này không
     có tiếng, nên mic điện thoại không thu lại tiếng MC.

   Người xem chưa thấy sảnh, họ chỉ thấy camera điện thoại. Nếu không kết nối được thì chụp màn hình gửi mình.
3. Tắt live: bấm X rồi chọn Kết thúc. Mở lại LIVE Studio, xin quyền lại, rồi xem còn điều kiện nào màu xám. Còn thì chụp
   gửi mình.

## 2. Chọn cách phát từ Mac

|  | TikTok LIVE Studio (nên thử trước) | OBS Studio và khóa phát |
|---|---|---|
| Cần gì | Quyền dùng LIVE Studio | Địa chỉ máy chủ (Server URL) và khóa phát (Stream key) do TikTok cấp |
| Tải ở đâu | https://www.tiktok.com/studio/download | https://obsproject.com |
| Đưa sảnh vào bằng | Nguồn Link (trang web) | Nguồn Browser |
| Đã thử với sảnh | Chưa | Chưa |

- **LIVE Studio** là ứng dụng chính thức của TikTok và đã có bản cho Mac. Bản Mac cần macOS 12 trở lên, chip Apple M1
  trở lên và 8 GB RAM; TikTok khuyên dùng M2 Pro và 16 GB. Không cần khóa phát.
- Quyền dùng LIVE Studio: đăng nhập rồi bấm Get access. Điều kiện chưa đạt hiện bằng chữ xám, đạt đủ thì xin lại. Điều
  kiện khác nhau theo nước. Bài của TikTok cho Mỹ (9/2024) ghi:
  - người làm nội dung game (đã đăng video hoặc live về game) cần 1.000 người theo dõi;
  - người làm nội dung khác cần 10.000 người theo dõi;
  - ai chưa đủ mà đã live đều trên nền tảng khác thì có đơn xin riêng.
- Nếu được cấp quyền dùng thử, phải live ít nhất 25 phút, 2 lần trong tuần đầu, không thì bị thu hồi.
- **Khóa phát** TikTok chỉ cấp cho một số tài khoản. Theo các hướng dẫn trên mạng (mình chưa tự kiểm được), khóa nằm ở
  trang LIVE Producer của TikTok (livecenter.tiktok.com/producer) và có thể đổi sau mỗi buổi, nên lấy lại trước mỗi lần live.
  Nếu có khóa thì dùng OBS: chỉnh được chính xác vị trí, tiếng và chất lượng.

## 3. Chuẩn bị sảnh (làm mỗi lần live)

1. Mở Terminal, chạy `cd ~/Projects/Coding/sanh-thoi-trang && npm start`. Để cửa sổ này mở suốt buổi.
2. Mở trang điều khiển http://localhost:3100/admin.html. Đợi mục "Giọng MC" báo "Giọng AI VieNeu: 25 giọng", khoảng vài giây.
3. Mục **Giả lập**: bấm Tắt giả lập rồi bấm "Xóa người giả". Nhãn đỏ GIẢ LẬP trên màn hình live phải mất. Đừng chạy giả
   lập khi đang live thật: người xem và quà giả là lừa khán giả.
4. Mục **Cài đặt**: tích "Chừa khung camera người dẫn". Màn hình live hiện một khung viền hồng ở góc phải dưới, và các dòng
   của bảng hướng dẫn chuyển lên banner trên cùng. Xem lại "Thưởng khi theo dõi kênh" và "MC nhắc theo dõi", rồi bấm Lưu cài đặt.
5. Tích "Hiện vùng giao diện TikTok che" để canh bố cục. Nhớ bỏ tích trước khi live.

## 4a. Phát bằng TikTok LIVE Studio

Tên nút trong LIVE Studio có thể hơi khác.

1. Cài LIVE Studio, mở lên và đăng nhập tài khoản TikTok.
2. Chọn khung dọc (9:16).
3. Thêm nguồn: bấm ＋ cạnh Sources (Nguồn), chọn **Link**, dán `http://localhost:3100/`. Kéo cho trang phủ kín khung hình.
4. Bấm ＋ và chọn **Camera** (camera của Mac, hoặc iPhone qua Continuity Camera). Đặt camera vào khung viền hồng và kéo cho vừa khung.
5. Chọn micro. Tốt nhất là tai nghe có mic.
6. Kiểm tra tiếng: trong trang điều khiển bấm "📣 MC nhắc theo dõi kênh". MC sẽ nói trên màn hình live và thanh âm lượng
   của nguồn Link trong LIVE Studio phải nhảy. **Chưa thử:** nguồn Link của LIVE Studio có lấy tiếng của trang hay không.
   Nếu màn hình live hiện nút "Bấm để bật âm thanh" thì trình duyệt trong LIVE Studio đang chặn tiếng, và người xem cũng
   sẽ thấy nút này: đừng live, báo mình. Nếu chỉ không có tiếng, lấy tiếng từ Chrome (TikTok có hướng dẫn chọn ứng dụng để
   thu tiếng):
   - mở `http://localhost:3100/` trong Chrome và bấm vào trang một lần để bật tiếng;
   - trong LIVE Studio, mở Audio mixer, bấm Settings dưới mục Audio, rồi chọn Google Chrome.

   Thu theo cách này thì mở trang điều khiển bằng Safari, đừng mở bằng Chrome: tiếng "Nghe thử" ở đó cũng sẽ vào live.
7. Đặt tiêu đề và chủ đề, rồi bấm Go LIVE.

## 4b. Phát bằng OBS (khi có khóa phát)

Cài đặt (Settings):

| Mục | Chỉnh |
|---|---|
| Video | Base (Canvas) Resolution `1080x1920`, Output (Scaled) Resolution `1080x1920`, FPS `30` |
| Output (Output Mode: Advanced) → Streaming | Encoder `Apple VT H264 Hardware Encoder`, Rate Control `CBR`, Bitrate `4500 Kbps`, Keyframe Interval `2 s`; tab Audio: `160` |
| Audio | Sample Rate `48 kHz` |
| Stream | Service `Custom…`, Server và Stream Key: dán của TikTok |

Nguồn (Sources), xếp từ trên xuống:

1. **Video Capture Device**: camera. Bấm chuột phải → Transform → Edit Transform (⌘E): Position `758`, `1290`; Bounding Box
   Type `Scale to outer bounds`; Bounding Box Size `300` × `400`; Alignment in Bounding Box `Center`; tích Crop to Bounding Box.
   Camera sẽ nằm vừa trong khung viền hồng.
2. **Audio Input Capture**: micro.
3. **Browser**: URL `http://localhost:3100/`, Width `1080`, Height `1920`, tích **Control audio via OBS**. Trên Mac phải tích
   mục này: không tích thì tiếng MC và nhạc không vào live.

Bấm "📣 MC nhắc theo dõi kênh" trong trang điều khiển. Thanh tiếng của nguồn Browser trong Audio Mixer phải nhảy. Muốn tự
nghe thì đeo tai nghe, mở Advanced Audio Properties và chọn "Monitor and Output" cho nguồn Browser.

Bấm Start Streaming. Nếu trang lấy khóa phát có nút Go LIVE thì bấm nó sau khi OBS đã phát.

## 5. Khi đã lên live

1. Trong trang điều khiển, mục **Kết nối TikTok**: nhập tên kênh rồi bấm Kết nối. Thanh trên cùng phải báo "TikTok: đang
   nhận live". Chỉ kết nối được khi kênh đang live.
2. Thử bằng điện thoại với một tài khoản khác: bình luận "áo dài" thì vài giây sau người đó vào sảnh; bấm Follow thì người
   đó lên sàn diễn.
3. Trong buổi: nói chuyện với khách, gọi tên người mới vào, mở bình chọn, bấm "Cả sảnh tạo dáng", "MC nhắc theo dõi kênh".
   Mục Nhật ký ghi mọi việc trên sảnh.
4. Kết thúc: End LIVE trong LIVE Studio (hoặc Stop Streaming trong OBS), bấm Ngắt trong trang điều khiển, rồi bấm Ctrl-C ở
   cửa sổ Terminal để tắt server.

## 6. Live thử trước

Live thử 5–10 phút vào giờ vắng và nhờ một người xem bằng điện thoại. Kiểm tra:

- hình nét;
- tiếng MC to rõ, không vọng hay lặp;
- camera nằm đúng khung;
- chữ không bị giao diện TikTok che;
- bình luận và Follow hiện trên sảnh.

## 7. Giữ kênh an toàn

- Luôn có người thật trên camera, nói chuyện với khách. Theo các hướng dẫn về luật LIVE trên mạng (trang của TikTok
  mình đọc được chưa nói rõ), TikTok hạn chế đề xuất hoặc khóa những buổi live tĩnh, không có người.
- Thưởng Follow: theo Quy định cộng đồng của TikTok (hiệu lực 24/9/2026), nội dung tìm cách lôi kéo người xem tặng quà,
  thả tim hay theo dõi có thể không được đề xuất trên trang Dành cho bạn. Hãy theo dõi lượt xem. Nếu lượt xem tụt hẳn hoặc
  bị cảnh báo, chọn "Không thưởng, chỉ cảm ơn" và đặt nhắc theo dõi về 0.
- Không bật giả lập khi live.
- Không dùng logo thương hiệu thật, không mặc đồ hở hang. Nhạc của sảnh do máy tự tạo nên không dính bản quyền; đừng mở
  nhạc có bản quyền cho mic thu vào.
- Không đưa mật khẩu, cookie hay `sessionid` vào đâu cả: sảnh không cần chúng.

## 8. Mac và mạng

- Cắm sạc, đóng các ứng dụng nặng, bật Không làm phiền.
- Giữ máy không ngủ bằng cách chạy `caffeinate -di` trong một cửa sổ Terminal khác.
- Mạng tải lên ổn định từ khoảng 10 Mbps (đo bằng speedtest). Tốt nhất là cắm dây mạng.
- Lần đầu, macOS sẽ hỏi quyền Camera và Micro cho LIVE Studio hoặc OBS. Cho phép trong Cài đặt hệ thống → Quyền riêng tư & Bảo mật.
- Đeo tai nghe để mic không thu lại tiếng MC từ loa.

## 9. Gặp lỗi

| Thấy gì | Làm gì |
|---|---|
| "Kênh @… chưa phát trực tiếp" | Bắt đầu live trước, đợi 10–20 giây, rồi bấm Kết nối lại |
| "Máy chủ ký kết nối (Euler Stream) đang giới hạn" | Đợi vài phút rồi thử lại |
| Live không có tiếng MC | OBS: tích Control audio via OBS, nguồn Browser không bị tắt tiếng; trang điều khiển: mục Giọng MC đang bật |
| Màn hình sảnh đứng hoặc trắng | OBS: chuột phải nguồn Browser → Refresh. LIVE Studio: xóa rồi thêm lại nguồn Link. Server vẫn giữ người trong sảnh và bảng điểm |
| Hình giật, rớt khung | Hạ Bitrate xuống 3000, hoặc Output Resolution `720x1280` |
| Bình luận lên sảnh chậm vài giây | Bình thường |
| Kết nối TikTok báo lỗi lạ | Thư viện kết nối không chính thức, TikTok đổi là có thể hỏng. Buổi live vẫn chạy, chỉ sảnh không phản ứng; báo mình |
