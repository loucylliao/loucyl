import os
import js

os.makedirs("PYTHON", exist_ok=True)
open("PYTHON/message.txt", "a").close()


def get_unread_count(last_read_count):
    with open("PYTHON/message.txt", "r") as f:
        total = sum(1 for line in f if line.strip())
    return max(0, total - last_read_count)


def download_file(filename):
    """Trigger a browser download of a file in scripts/."""
    doc = js.document
    a = doc.createElement("a")
    a.href = f"scripts/{filename}"
    a.download = filename
    doc.body.appendChild(a)
    a.click()
    a.remove()


async def main():
    last_read_count = 0

    while True:
        unread = get_unread_count(last_read_count)
        print("[1] new message")
        print("[2] reply message")
        print(f"[3] view message [{unread} unread]")
        print("[0] download file")

        try:
            choice = int(await ainput("choose an option: "))
        except ValueError:
            print("Please enter a number.\n")
            continue

        if choice == 1:
            message = await ainput("enter your message: ")
            with open("PYTHON/message.txt", "w") as f:
                f.write(message)
            print("message sent.")
            last_read_count = 0

        elif choice == 2:
            with open("PYTHON/message.txt", "r") as f:
                messages = f.readlines()
            if messages:
                print("last message:", messages[-1].strip())
            else:
                print("no previous messages.")
            reply = await ainput("enter your reply: ")
            with open("PYTHON/message.txt", "a") as f:
                f.write("\n" + reply)
            print("reply sent.")

        elif choice == 3:
            with open("PYTHON/message.txt", "r") as f:
                text = f.read()
            print("\n--- messages ---")
            print(text.strip() or "(empty)")
            print("----------------")
            last_read_count = sum(1 for line in text.splitlines() if line.strip())

            # Stay in this view until the user chooses [0] exit
            print("[0] exit")
            await ainput("choose an option: ")

        elif choice == 0:
            download_file("write.py")
            print("downloading write.py ...")
            break

        else:
            print("invalid option.")

        print()


await main()