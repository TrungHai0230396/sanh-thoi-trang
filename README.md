# Sảnh thời trang · bản mẫu

Màn hình tương tác cho TikTok LIVE: người xem bình luận là bước vào sảnh, gõ tên phong cách để chọn đồ,
thả tim cho cả sảnh tạo dáng. Tặng quà thì được thêm phụ kiện, lên sàn catwalk hoặc lên "trang bìa".
Chạy trên máy của bạn, đưa vào OBS như một trang web.

Đây là **bản mẫu**: chế độ giả lập đã chạy và có test. Kết nối TikTok đã viết nhưng **chưa thử với live thật**.

## Chạy

Cần Node.js 20 trở lên.

```bash
npm install          # chỉ để có thư viện kết nối TikTok; giả lập chạy được cả khi không cài
npm run setup:voice  # một lần: giọng MC AI (khoảng 1,2 GB, xem "Giọng MC" bên dưới)
npm start
```

- Màn hình live (đưa vào OBS): http://localhost:3100/
- Trang điều khiển: http://localhost:3100/admin.html
- Tủ đồ (29 bộ lên sàn, 35 phụ kiện và trang sức, dáng đi, dáng tạo): http://localhost:3100/wardrobe.html

Server chỉ nghe trên máy này (`127.0.0.1`). Muốn đổi cổng: `PORT=4000 npm start`.

## Đưa lên live

Từng bước, từ tài khoản tới lúc tắt live: [HUONG-DAN-LIVE.md](HUONG-DAN-LIVE.md). Tóm tắt:

1. Phát từ Mac bằng TikTok LIVE Studio (đã có bản Mac, thêm sảnh bằng nguồn **Link**), hoặc bằng OBS nếu TikTok cấp
   khóa phát (nguồn **Browser**, 1080 × 1920, tích "Control audio via OBS": trên Mac không tích thì live không có tiếng).
2. Nên có **người dẫn thật trên camera**. Tích "Chừa khung camera người dẫn" trong trang điều khiển: khung 300 × 400 ở
   x 758, y 1290, các dòng của bảng hướng dẫn chuyển lên banner. Theo các hướng dẫn về luật LIVE, TikTok hạn chế đề xuất
   hoặc khóa những buổi live tĩnh không có người thật. Bản mẫu này không có mẹo né kiểm duyệt nào, và đừng thêm vào.
3. Trong trang điều khiển: bật "Hiện vùng giao diện TikTok che" để canh bố cục (vùng che chỉ là ước lượng).

## Luật chơi

| Người xem làm | Trên màn hình |
|---|---|
| Vào xem | Dòng "… vừa vào xem" |
| Bình luận | Bước vào sảnh (24 chỗ hai bên sàn), hiện bong bóng chữ |
| Gõ tên phong cách ("áo dài trắng", "váy cưới", "tuxedo", "đầm đuôi cá", "y2k"…) | Ghi nhận ✨, lần lên sàn tới mặc đúng bộ đó (từ khóa dài hơn thắng: "áo dài trắng" không lẫn với "áo dài") |
| Thả tim | Tim bay; đủ số tim (mặc định 300) thì cả sảnh tạo dáng, đèn flash |
| Theo dõi kênh (Follow) | Lên sàn catwalk với thẻ "Fan mới của kênh" (mặc bộ đã gõ nếu có), MC cảm ơn; tên có viền hồng. Có thể đổi thành thêm một món đồ, hoặc chỉ cảm ơn |
| Quà nhỏ (dưới 10 xu) | Thêm một món: hoa tai, vòng cổ, chuỗi ngọc trai, vòng ngọc bích, vương miện nhỏ, nơ, kính, mũ, nón lá, túi, bó hoa, áo khoác… (trang sức có ánh lấp lánh) |
| Quà vừa (10–99 xu) | Lên sàn catwalk bằng bộ mới, MC đọc tên |
| Quà lớn (từ 100 xu) | Lên "trang bìa tạp chí" đội vương miện vàng: khung bìa, pháo giấy, kèn |
| Bình chọn (người live bấm mở) | Gõ 1 hoặc 2; bộ thắng được người mẫu của sảnh trình diễn |

- Ngưỡng xu, số chỗ, số tim, thời gian bình chọn đều chỉnh trong trang điều khiển (lưu ở `data/settings.json`).
- Khi sảnh đầy: người bình luận chỉ thay chỗ người chưa tặng gì và im lặng trên 45 giây; người tặng quà thay
  chỗ người tặng ít hơn.
- Theo dõi kênh: mỗi người được thưởng một lần trong buổi, bỏ theo dõi rồi theo dõi lại không được thêm (tắt server thì
  đếm lại từ đầu). Người tặng quà lên sàn trước người theo dõi. Khi đã có 4 người chờ lên sàn vì theo dõi, người theo dõi
  sau được thêm một món đồ ngay.
- Banner trên cùng luân phiên lời chào và lời mời Follow. MC nhắc theo dõi kênh mỗi 5 phút (chỉnh được, 0 là tắt; trang
  điều khiển có nút nhắc ngay). Theo Quy định cộng đồng của TikTok, nội dung tìm cách lôi kéo người xem theo dõi có thể
  không được đề xuất trên trang Dành cho bạn; nếu lượt xem tụt hoặc bị cảnh báo, chọn "Không thưởng".
- Không ai trong sảnh thì cứ khoảng 50 giây "người mẫu của sảnh" diễn một bộ, để sàn không đứng yên.
- Bảng xếp hạng tính điểm = số xu quà trong buổi (mất khi tắt server).

## Giả lập

Trang điều khiển có nút bật giả lập (vắng, vừa, đông) và nút bắn từng sự kiện. Nhãn đỏ **GIẢ LẬP** hiện trên
màn hình live chừng nào còn người giả trong sảnh hoặc trên bảng xếp hạng (bấm "Xóa người giả" để dọn). Khi kết nối TikTok, người giả tự rời sảnh và bảng xếp hạng. Bản này không có
người xem hay bảng điểm dựng sẵn.

## Kết nối TikTok

Nhập tên kênh trong trang điều khiển khi kênh **đang live**. Không cần mật khẩu, cookie hay `sessionid`, và
đừng dán chúng vào đâu cả.

- Dùng [`tiktok-live-connector`](https://www.npmjs.com/package/tiktok-live-connector): thư viện **không chính
  thức**, dịch ngược. TikTok đổi giao thức là có thể hỏng.
- Việc ký kết nối đi qua Euler Stream (bên thứ ba, miễn phí có giới hạn số lần).
- Thư viện dùng giấy phép AGPL có sửa đổi: dùng để tự live thì không sao; nếu đem bán tool cho người khác thì
  cần đọc kỹ giấy phép.

## Giọng MC và âm thanh

- Giọng MC mặc định là giọng AI [VieNeu-TTS](https://pypi.org/project/vieneu/) (mã nguồn mở, giấy phép Apache 2.0):
  chạy ngay trên máy, không cần mạng hay tài khoản, có 25 giọng nam và nữ, giọng Bắc, Trung, Nam.
- Cài một lần bằng `npm run setup:voice`. Lệnh này cần [uv](https://docs.astral.sh/uv/) (`brew install uv`), tải
  Python 3.12 và thư viện vào `vieneu/.venv`, mô hình vào `vieneu/model`, tổng khoảng 1,2 GB. Gỡ: xóa hai thư mục đó.
- Trên MacBook M1 Pro, mô hình nạp trong khoảng 2 giây sau khi bật server, mỗi câu MC mất 0,6–1,2 giây.
- Trong lúc giọng AI đang nạp, hoặc nếu nó lỗi, MC đọc bằng giọng tiếng Việt của macOS (lệnh `say`). Giọng AI lỗi
  thì server tự bật lại, tối đa 3 lần.
- Câu đã đọc được lưu tạm ở `data/tts/` và tự xóa sau 2 ngày. Một câu giọng AI khoảng 20 KB (MP3).
- Trang điều khiển, mục "Giọng MC": chọn giọng, tốc độ đọc, âm lượng, và nút "Nghe thử". Nút này chỉ phát ở trang
  điều khiển, không lên live. Với giọng AI, tốc độ được chỉnh lúc phát và giữ nguyên cao độ.
- VieNeu bắt chước được giọng người từ vài giây ghi âm, nhưng bản này không dùng tính năng đó. Nếu thêm vào sau này,
  chỉ dùng giọng của chính bạn hoặc của người đã đồng ý.
- Trước khi đọc, tên được làm sạch: bỏ emoji và ký hiệu, `mai.anh_99` thành "mai anh 99", chữ in hoa thành chữ
  thường, tối đa 4 chữ.
- Mỗi loại câu có vài cách nói, không lặp lại câu vừa nói. Câu giới thiệu lên sàn và bình chọn luôn được đọc.
  Lời chào và cảm ơn thì bỏ bớt khi đang dồn nhiều câu, để giọng không trễ so với hình.
- Trên Windows chưa thử. Giọng AI chạy trên CPU nên có thể dùng được, nhưng phải cài tay trong thư mục `vieneu`:
  `uv venv --python 3.12 .venv`, rồi `uv pip install --python .venv\Scripts\python.exe -r requirements.txt`, rồi
  `.venv\Scripts\python.exe worker.py --download`. Windows không có giọng dự phòng của macOS.
- Nhạc nền và hiệu ứng (màn trập máy ảnh, chuông, kèn) được trình duyệt tự tạo, không dùng file nhạc nào, nên
  không dính bản quyền. Trình duyệt thường cần bấm vào trang một lần mới phát tiếng; trong OBS thì phát ngay.

## Thêm hoặc sửa bộ đồ

- Danh sách bộ đồ, phụ kiện, trang sức, từ khóa: `public/js/catalog.js`.
- Hình vẽ (SVG, không mặt, tay chân cử động; họa tiết chấm bi, hoa nhí, ca rô, sequin): `public/js/figure.js`;
  dáng đi, dáng tạo, ánh lấp lánh: `public/css/figure.css`.
- `npm test` kiểm mọi bộ và mọi món đều vẽ được, và không có từ khóa nào thuộc hai bộ.
- Xem kết quả ở trang Tủ đồ. Tránh logo thương hiệu thật và đồ hở hang (luật TikTok).

## Cấu trúc

```
HUONG-DAN-LIVE.md    hướng dẫn lên live: tài khoản, LIVE Studio hoặc OBS, camera, kiểm tra, lỗi thường gặp
server.js            server: trang, luồng sự kiện (SSE), API điều khiển
src/game.js          luật chơi: sảnh, hàng chờ trình diễn, bình chọn, bảng xếp hạng
src/simulator.js     người xem giả
src/tiktok.js        đọc bình luận, tim, quà từ TikTok LIVE
src/tts.js           giọng MC: VieNeu, dự phòng bằng giọng macOS
vieneu/worker.py     chạy nền giữ mô hình giọng AI, đọc từng câu cho server
vieneu/setup.sh      cài giọng AI (npm run setup:voice)
public/index.html    màn hình live 1080 × 1920
public/admin.html    trang điều khiển
public/wardrobe.html tủ đồ
public/js/           vẽ nhân vật, hiệu ứng, âm thanh
test/game.test.js    test luật chơi (npm test)
test/tts.test.js     test giọng MC, với một tiến trình giả thay mô hình
```

## Còn thiếu

- Thử kết nối với một buổi live thật.
- Thử LIVE Studio bản Mac (nguồn Link có lấy tiếng của trang không) và OBS với sảnh.
- Thử giọng AI trên Windows.
- Lưu bảng xếp hạng qua các lần tắt mở.
- Hình người mẫu đẹp hơn nếu muốn (ảnh hoặc video AI nền trong suốt thay cho hình vẽ).
