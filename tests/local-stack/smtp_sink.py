import asyncio, time
from aiosmtpd.controller import Controller
class Sink:
    async def handle_DATA(self, server, session, envelope):
        name = f"/tmp/sb/mail/{time.time():.6f}-{envelope.rcpt_tos[0]}.eml"
        open(name, "wb").write(envelope.content)
        return "250 OK"
c = Controller(Sink(), hostname="127.0.0.1", port=2525); c.start()
asyncio.get_event_loop().run_forever()
