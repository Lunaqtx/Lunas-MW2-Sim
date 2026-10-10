RUST SIMULATOR - HOST IT YOURSELF (Windows)
===========================================

This folder runs the game on your own PC, so you and your friends can play
without signing in to claude.ai. Up to 12 players per lobby.

WHAT YOU NEED (one time)
  1. Node.js (LTS) from https://nodejs.org - install with the default options.
  2. For friends over the internet: Cloudflare's free tunnel tool.
     Open PowerShell and run:
         winget install --id Cloudflare.cloudflared
     (No account needed.)

PLAY
  1. Double-click start.bat.
     - A server window opens (keep it open while you play).
     - The game opens in your browser at http://localhost:8080
     - If cloudflared is installed, a second "tunnel" window opens. Look for
       a line like  https://something-random.trycloudflare.com
       That is the link your friends open. It changes every time you start.
  2. In the game: Play -> Online lobby -> Create lobby. Set the lobby rules.
  3. Send friends the trycloudflare link plus the lobby code (RUST-1234).
     They open the link, pick Online lobby, enter the code and press Join.
  4. When everyone is in, press Start match.

SAME WI-FI ONLY (no tunnel needed)
  The server window prints a "Same Wi-Fi / LAN" address such as
  http://192.168.1.20:8080 - friends on your network can open that instead.
  Windows may ask to allow Node.js through the firewall: allow it on
  private networks.

NOTES
  - Whoever creates the lobby is the host: they set the rules and run the
    bots. If the host leaves, the match ends for everyone.
  - The trycloudflare link is public while the tunnel runs - only share it
    with people you want in. Close the tunnel window to shut it.
  - To use another port:  set PORT=9000  then  node server.js
  - Your browser still needs internet access to load the 3D engine and fonts.

HOST IT PERMANENTLY ON RENDER (free, no tunnel)
  This folder is ready to deploy as-is. You get a fixed link like
  https://rust-simulator.onrender.com that works any time.
  1. Make a free GitHub account, create a new repository, and upload
     everything in this folder (Add file -> Upload files).
  2. Make a free account at https://render.com and choose
     New -> Blueprint, then pick that repository. Render reads render.yaml
     and sets everything up. (Or New -> Web Service, Start Command:
     node server.js, Instance type: Free.)
  3. Open the onrender.com link it gives you and share it with friends.
  The free tier sleeps after 15 minutes with nobody playing; the first
  visit after that takes about a minute to wake it up. While anyone is
  connected it stays awake.
  To update the game later, replace index.html in the GitHub repository;
  Render redeploys automatically.
