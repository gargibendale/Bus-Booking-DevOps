import shortuuid
from pwdlib import PasswordHash

# Generate a short, random UUID
short_id = shortuuid.uuid()
print(f"Short UUID: {short_id}")

password_hash = PasswordHash.recommended()  # ---> uses Argon2
string = "jdoe3434"
hashed_pw = password_hash.hash(string)
print(hashed_pw)
