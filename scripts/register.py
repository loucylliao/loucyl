import js

users = {
    "loucyl": "Jasmine Loucyl Liao",
}


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
    while True:
        print("[1] register")
        print("[2] login")
        print("[3] access database")
        print("[0] download file")

        try:
            action = int(await ainput("choose an option: "))
        except ValueError:
            print("Please enter a number.\n")
            continue

        if action < 0 or action > 3:
            print("Invalid option.\n")
            continue

        if action == 1:
            username = await ainput("username: ")
            if username not in users:
                name = await ainput("name: ")
                users[username] = name
                print("Welcome,", users[username].upper())
            else:
                print("User already exists.")

        elif action == 2:
            username = await ainput("username: ")
            if username in users:
                print("Welcome,", users[username].upper())
            else:
                print("User not found. Please register.")

        elif action == 3:
            username = await ainput("username: ")
            if username in users:
                print("\n--- DATABASE ---")
                for user, name in users.items():
                    print("username:", user, "| name:", name.upper())
                print("----------------")
            else:
                print("Access denied.")

        elif action == 0:
            download_file("register.py")
            print("downloading register.py ...")
            break

        print()


await main()