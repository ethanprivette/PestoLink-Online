
# [Try PestoLink-Online here!](http://pestol.ink/)

*v1.0.0*

## Embedded Platform Support

[PestoLink](https://github.com/AlfredoSystems/PestoLink-MicroPython) currently supports two embedded platforms: **MicroPython** and **Arduino**.

- MicroPython support is designed for the [RP2040 on XRP Kits](https://www.sparkfun.com/products/22230).
- Arduino support is designed for the [ESP32](https://www.alfredosys.com/products/alfredo-nou2/).

Platform-specific libraries:

- MicroPython-based robots use the module: [PestoLink-MicroPython](https://github.com/AlfredoSystems/PestoLink-MicroPython/tree/main)
- Arduino-based robots use the library: [PestoLink-Receive](https://github.com/AlfredoSystems/PestoLink-Receive)

---

## Browser Support

PestoLink works with **Google Chrome** on the following platforms:

- Windows
- Android
- macOS
- Linux
- ChromeOS

Note for iOS: 
- Very few iOS browsers support Web Bluetooth. While Google Chrome has worked for some users, the best option found so far is [Bluefy](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055).

---

## What does "Override axes/buttons with keyboard" do?

By default, keyboard data is sent separately from axis/button data.

If your robot was programmed to be driven with gamepad or mobile input, but you don’t have either on hand, you can enable this switch to override axis/button data using the keyboard.

- `W`, `A`, `S`, `D` override **Axis 0** and **Axis 1**
- `I`, `J`, `K`, `L` override **Axis 2** and **Axis 3**
- `Z`, `X`, `C`, `V`, `B`, `N`, `M`, `,` override **Buttons 0–7**

---

If you have any questions, feel free to reach out: **alfredopurchases@gmail.com**
