/**
 * Dữ liệu hành chính Việt Nam sau sắp xếp 2025
 * Hiệu lực từ 01/07/2025 theo Nghị quyết 202/2025/QH15 (tỉnh) và Nghị quyết 1685/NQ-UBTVQH15 (xã/phường)
 * - Cả nước: 34 đơn vị hành chính cấp tỉnh (6 thành phố + 28 tỉnh)
 * - TP. Hồ Chí Minh: 168 đơn vị cấp xã (113 phường + 54 xã + 1 đặc khu)
 */

export const PROVINCES: string[] = [
  // 6 thành phố trực thuộc Trung ương
  "Thành phố Hà Nội",
  "Thành phố Hồ Chí Minh",
  "Thành phố Hải Phòng",       // = Hải Phòng + Hải Dương
  "Thành phố Đà Nẵng",         // = Đà Nẵng + Quảng Nam
  "Thành phố Cần Thơ",         // = Cần Thơ + Hậu Giang + Sóc Trăng
  "Thành phố Huế",
  // 28 tỉnh (theo vùng địa lý Bắc → Trung → Nam)
  "Cao Bằng",
  "Điện Biên",
  "Lai Châu",
  "Sơn La",
  "Lào Cai",                   // = Lào Cai + Yên Bái
  "Tuyên Quang",               // = Tuyên Quang + Hà Giang
  "Thái Nguyên",               // = Thái Nguyên + Bắc Kạn
  "Lạng Sơn",
  "Quảng Ninh",
  "Bắc Ninh",                  // = Bắc Ninh + Bắc Giang
  "Hưng Yên",                  // = Hưng Yên + Thái Bình
  "Phú Thọ",                   // = Phú Thọ + Vĩnh Phúc + Hòa Bình
  "Ninh Bình",                 // = Ninh Bình + Hà Nam + Nam Định
  "Thanh Hóa",
  "Nghệ An",
  "Hà Tĩnh",
  "Quảng Trị",                 // = Quảng Trị + Quảng Bình
  "Quảng Ngãi",                // = Quảng Ngãi + Kon Tum
  "Gia Lai",                   // = Gia Lai + Bình Định
  "Đắk Lắk",                  // = Đắk Lắk + Phú Yên
  "Khánh Hòa",                 // = Khánh Hòa + Ninh Thuận
  "Lâm Đồng",                  // = Lâm Đồng + Đắk Nông + Bình Thuận
  "Đồng Nai",                  // = Đồng Nai + Bình Phước
  "Tây Ninh",                  // = Tây Ninh + Long An
  "An Giang",                  // = An Giang + Kiên Giang
  "Đồng Tháp",                 // = Đồng Tháp + Tiền Giang
  "Vĩnh Long",                 // = Vĩnh Long + Bến Tre + Trà Vinh
  "Cà Mau",                    // = Cà Mau + Bạc Liêu
];

/**
 * Danh sách phường/xã theo tỉnh.
 * Hiện tại chỉ có TP. Hồ Chí Minh (168 đơn vị từ 01/07/2025).
 */
export const WARDS_BY_PROVINCE: Record<string, string[]> = {
  "Thành phố Hồ Chí Minh": [
    // 113 Phường
    "Phường An Đông",
    "Phường An Hội Đông",
    "Phường An Hội Tây",
    "Phường An Khánh",
    "Phường An Lạc",
    "Phường An Nhơn",
    "Phường An Phú",
    "Phường An Phú Đông",
    "Phường Bà Rịa",
    "Phường Bàn Cờ",
    "Phường Bảy Hiền",
    "Phường Bến Cát",
    "Phường Bến Thành",
    "Phường Bình Cơ",
    "Phường Bình Dương",
    "Phường Bình Đông",
    "Phường Bình Hưng Hòa",
    "Phường Bình Lợi Trung",
    "Phường Bình Phú",
    "Phường Bình Quới",
    "Phường Bình Tân",
    "Phường Bình Tây",
    "Phường Bình Thạnh",
    "Phường Bình Thới",
    "Phường Bình Tiên",
    "Phường Bình Trị Đông",
    "Phường Bình Trưng",
    "Phường Cát Lái",
    "Phường Cầu Kiệu",
    "Phường Cầu Ông Lãnh",
    "Phường Chánh Hiệp",
    "Phường Chánh Hưng",
    "Phường Chánh Phú Hòa",
    "Phường Chợ Lớn",
    "Phường Chợ Quán",
    "Phường Diên Hồng",
    "Phường Dĩ An",
    "Phường Đông Hòa",
    "Phường Đông Hưng Thuận",
    "Phường Đức Nhuận",
    "Phường Gia Định",
    "Phường Gò Vấp",
    "Phường Hạnh Thông",
    "Phường Hiệp Bình",
    "Phường Hòa Bình",
    "Phường Hòa Hưng",
    "Phường Hòa Lợi",
    "Phường Khánh Hội",
    "Phường Lái Thiêu",
    "Phường Linh Xuân",
    "Phường Long Bình",
    "Phường Long Hương",
    "Phường Long Nguyên",
    "Phường Long Phước",
    "Phường Long Trường",
    "Phường Minh Phụng",
    "Phường Nhiêu Lộc",
    "Phường Phú An",
    "Phường Phú Định",
    "Phường Phú Lâm",
    "Phường Phú Lợi",
    "Phường Phú Mỹ",
    "Phường Phú Nhuận",
    "Phường Phú Thạnh",
    "Phường Phú Thọ",
    "Phường Phú Thọ Hòa",
    "Phường Phú Thuận",
    "Phường Phước Long",
    "Phường Phước Thắng",
    "Phường Rạch Dừa",
    "Phường Sài Gòn",
    "Phường Tam Bình",
    "Phường Tam Long",
    "Phường Tam Thắng",
    "Phường Tân Bình",
    "Phường Tân Định",
    "Phường Tân Đông Hiệp",
    "Phường Tân Hiệp",
    "Phường Tân Hòa",
    "Phường Tân Hưng",
    "Phường Tân Khánh",
    "Phường Tân Mỹ",
    "Phường Tân Phú",
    "Phường Tân Sơn",
    "Phường Tân Sơn Hòa",
    "Phường Tân Sơn Nhất",
    "Phường Tân Sơn Nhì",
    "Phường Tân Tạo",
    "Phường Tân Thành",
    "Phường Tân Thới Hiệp",
    "Phường Tân Thuận",
    "Phường Tân Uyên",
    "Phường Tăng Nhơn Phú",
    "Phường Tây Nam",
    "Phường Tây Thạnh",
    "Phường Thạnh Mỹ Tây",
    "Phường Thới An",
    "Phường Thới Hòa",
    "Phường Thông Tây Hội",
    "Phường Thủ Dầu Một",
    "Phường Thủ Đức",
    "Phường Thuận An",
    "Phường Thuận Giao",
    "Phường Trung Mỹ Tây",
    "Phường Vĩnh Hội",
    "Phường Vĩnh Tân",
    "Phường Vũng Tàu",
    "Phường Vườn Lài",
    "Phường Xóm Chiếu",
    "Phường Xuân Hòa",
    // 54 Xã
    "Xã An Long",
    "Xã An Nhơn Tây",
    "Xã An Thới Đông",
    "Xã Bà Điểm",
    "Xã Bàu Bàng",
    "Xã Bàu Lâm",
    "Xã Bắc Tân Uyên",
    "Xã Bình Châu",
    "Xã Bình Chánh",
    "Xã Bình Giã",
    "Xã Bình Hưng",
    "Xã Bình Khánh",
    "Xã Bình Lợi",
    "Xã Bình Mỹ",
    "Xã Cần Giờ",
    "Xã Châu Đức",
    "Xã Châu Pha",
    "Xã Củ Chi",
    "Xã Dầu Tiếng",
    "Xã Đất Đỏ",
    "Xã Đông Thạnh",
    "Xã Hiệp Phước",
    "Xã Hóc Môn",
    "Xã Hòa Hiệp",
    "Xã Hòa Hội",
    "Xã Hồ Tràm",
    "Xã Hưng Long",
    "Xã Kim Long",
    "Xã Long Điền",
    "Xã Long Hải",
    "Xã Long Hòa",
    "Xã Long Sơn",
    "Xã Minh Thạnh",
    "Xã Ngãi Giao",
    "Xã Nghĩa Thành",
    "Xã Nhà Bè",
    "Xã Nhuận Đức",
    "Xã Phú Giáo",
    "Xã Phú Hòa Đông",
    "Xã Phước Hải",
    "Xã Phước Hòa",
    "Xã Phước Thành",
    "Xã Tân An Hội",
    "Xã Tân Nhựt",
    "Xã Tân Vĩnh Lộc",
    "Xã Thạnh An",
    "Xã Thái Mỹ",
    "Xã Thanh An",
    "Xã Thường Tân",
    "Xã Trừ Văn Thố",
    "Xã Vĩnh Lộc",
    "Xã Xuân Sơn",
    "Xã Xuân Thới Sơn",
    "Xã Xuyên Mộc",
    // 1 Đặc khu
    "Đặc khu Côn Đảo",
  ],
};
