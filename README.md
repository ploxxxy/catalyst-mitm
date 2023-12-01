# Tools to capture in-game traffic for Mirror's Edge: Catalyst
Part of The Beat Revival project: https://discord.gg/hKdUYpwkHr

> [!CAUTION]
> Please note that these captures will include your Origin token and MEC session keys, both of which give some control over your accounts for a specific period of time. If you're not okay with sharing them, please be sure to wait at least 24 hours before sending them to the team

1. Download dinput8.dll or compile it yourself from https://bitbucket.org/Bag123/ea-mitm/src/master/

When compiling it yourself, you'll have to edit the code with the following:
```diff 
--- a/EA-MITM/src/EA/ProtoSSL.cpp
+++ b/EA-MITM/src/EA/ProtoSSL.cpp
@@ -100,6 +100,19 @@ namespace ea {
                connection.LocalEndpoint.Address = inet_addr("127.0.0.1");
                connection.LocalEndpoint.Port = htons((uint16_t)state);

+               if (strcmp(address_string, "winter15.gosredirector.ea.com") == 0) {
+                       secure = 0;
+                       address_string = "localhost";
+                       address = 0x7F000001;
+               }
+
+               if (strcmp(address_string, "mec-gw.ops.dice.se") == 0) {
+                       secure = 0;
+                       port = 1338;
+                       address_string = "localhost";
+                       address = 0x7F000001;
+               }
+
                // Get remote address info
                addrinfo *result = nullptr;
                addrinfo hints;
```
2. Drop dinput8.dll and EA-MITM.ini into your game folder
3. Start up Blaze Redirector, Blaze Proxy & Gateway Proxy using `npm redirector`, `npm interceptor` & `npm gateway` accordingly
4. Start up the game, you'll now see the log output in your terminal. All traffic will also be captured and can be viewed in `./mec-gw/requests` & `./blaze/packets` folders. The tools to view Blaze packets (.tdf) aren't available for the public yet
