"""
===============================================================
 TAKUMI SUSHI — server.py
 Flask Backend + SQLite API Server
 
 วิธีรัน:
   pip install flask flask-cors
   python server.py
   
 API จะรันที่ http://localhost:5000
===============================================================
"""

from flask import Flask, jsonify, request, g
from flask_cors import CORS
import sqlite3
import os
import json
from datetime import datetime

# ========== CONFIG ==========
app = Flask(__name__)
CORS(app)  # อนุญาต cross-origin requests จาก frontend

DB_PATH = os.path.join(os.path.dirname(__file__), "takumi_sushi.db")

if __name__ == "__main__":
    app.run(debug=True)

# ========== DATABASE HELPERS ==========

def get_db():
    """เปิด connection ต่อ SQLite (1 connection ต่อ request)"""
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row  # ให้ return dict แทน tuple
    return g.db

@app.teardown_appcontext
def close_db(error):
    """ปิด connection เมื่อจบ request"""
    db = g.pop("db", None)
    if db is not None:
        db.close()

def init_db():
    """สร้างตาราง + เพิ่มข้อมูลเริ่มต้น"""
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    cursor = db.cursor()

    # ===== ตาราง menu =====
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS menu (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            name_jp     TEXT,
            price       INTEGER NOT NULL,
            category    TEXT    NOT NULL DEFAULT 'nigiri',
            emoji       TEXT    DEFAULT '🍣',
            img_url     TEXT,
            description TEXT,
            featured    INTEGER DEFAULT 0,
            available   INTEGER DEFAULT 1,
            created_at  TEXT    DEFAULT (datetime('now','localtime')),
            updated_at  TEXT    DEFAULT (datetime('now','localtime'))
        )
    """)

    # ===== ตาราง orders =====
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            order_code   TEXT    NOT NULL UNIQUE,
            customer_name TEXT   NOT NULL,
            phone        TEXT    NOT NULL,
            address      TEXT    NOT NULL,
            note         TEXT,
            payment      TEXT    DEFAULT 'cod',
            status       TEXT    DEFAULT 'pending',
            subtotal     INTEGER DEFAULT 0,
            delivery_fee INTEGER DEFAULT 50,
            total        INTEGER DEFAULT 0,
            created_at   TEXT    DEFAULT (datetime('now','localtime'))
        )
    """)

    # ===== ตาราง order_items =====
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS order_items (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id   INTEGER NOT NULL,
            menu_id    INTEGER,
            name       TEXT    NOT NULL,
            price      INTEGER NOT NULL,
            qty        INTEGER NOT NULL DEFAULT 1,
            subtotal   INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (menu_id)  REFERENCES menu(id)
        )
    """)

    # ===== ตาราง admins =====
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            username   TEXT    NOT NULL UNIQUE,
            password   TEXT    NOT NULL,
            created_at TEXT    DEFAULT (datetime('now','localtime'))
        )
    """)

    # ===== Seed: เพิ่มเมนูเริ่มต้น (ถ้ายังไม่มีข้อมูล) =====
    count = cursor.execute("SELECT COUNT(*) FROM menu").fetchone()[0]
    if count == 0:
        seed_menu = [
            ("ซูชิแซลมอน",        "サーモン寿司",      220, "nigiri",  "🍣", None, "แซลมอนสดนอร์เวย์ บนข้าวซูชิ รสชาติละมุน",      1),
            ("ซูชิทูน่า",          "マグロ寿司",        240, "nigiri",  "🍱", None, "ทูน่าสดคัดพิเศษ เนื้อนุ่มละลายในปาก",           1),
            ("มากิแตงกวา",         "きゅうり巻き",      120, "maki",    "🌿", None, "โรลแตงกวา กรอบสดชื่น เหมาะมังสวิรัติ",          0),
            ("มากิแซลมอนอโวคาโด",  "サーモンアボカド巻き",180,"maki",   "🥑", None, "แซลมอนและอโวคาโดในม้วนสาหร่าย",                1),
            ("ซาชิมิแซลมอน 5 ชิ้น","サーモン刺身",     280, "sashimi", "🐟", None, "แซลมอนสดหั่นหนา 5 ชิ้น เสิร์ฟพร้อมวาซาบิ",    0),
            ("ซาชิมิทูน่า 5 ชิ้น", "マグロ刺身",       320, "sashimi", "🐠", None, "ทูน่าบลูฟิน สีแดงสด รสเข้ม",                    0),
            ("ดราก้อนโรล",         "ドラゴンロール",    380, "special", "🐉", None, "โรลพิเศษ หุ้มด้วยอโวคาโด ราดซอสอูนากิ",         1),
            ("เรนโบว์โรล",         "レインボーロール",  420, "special", "🌈", None, "โรลสีสันสวยงาม หุ้มด้วยปลาหลากชนิด",            0),
            ("ไข่หวาน ทามาโกะ",    "玉子寿司",          80, "nigiri",  "🥚", None, "ไข่หวานญี่ปุ่น นุ่มหวาน เหมาะสำหรับเด็ก",       0),
            ("สไปซี่ทูน่า โรล",    "スパイシーツナロール",260,"maki",  "🌶️",None, "ทูน่าผสมซอสสไปซี่ เผ็ดนิดหน่อย อร่อยมาก",       0),
        ]
        cursor.executemany("""
            INSERT INTO menu (name, name_jp, price, category, emoji, img_url, description, featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, seed_menu)

    # ===== Seed: admin account =====
    admin_count = cursor.execute("SELECT COUNT(*) FROM admins").fetchone()[0]
    if admin_count == 0:
        cursor.execute(
            "INSERT INTO admins (username, password) VALUES (?, ?)",
            ("admin", "takumi2024")
        )

    db.commit()
    db.close()
    print(f"✅ Database initialized: {DB_PATH}")

# ========== UTILITY ==========

def row_to_dict(row):
    """แปลง sqlite3.Row → dict"""
    return dict(row) if row else None

def rows_to_list(rows):
    """แปลง list of sqlite3.Row → list of dict"""
    return [dict(r) for r in rows]

# ========== ROUTES: MENU ==========

@app.route("/api/menu", methods=["GET"])
def get_menu():
    """ดึงเมนูทั้งหมด — GET /api/menu?category=nigiri&featured=1"""
    db = get_db()
    query  = "SELECT * FROM menu WHERE available = 1"
    params = []

    cat = request.args.get("category")
    if cat:
        query += " AND category = ?"
        params.append(cat)

    featured = request.args.get("featured")
    if featured:
        query += " AND featured = ?"
        params.append(int(featured))

    query += " ORDER BY id ASC"
    rows = db.execute(query, params).fetchall()
    return jsonify(rows_to_list(rows))


@app.route("/api/menu/<int:menu_id>", methods=["GET"])
def get_menu_item(menu_id):
    """ดึงเมนูรายการเดียว — GET /api/menu/1"""
    db  = get_db()
    row = db.execute("SELECT * FROM menu WHERE id = ?", (menu_id,)).fetchone()
    if not row:
        return jsonify({"error": "ไม่พบเมนูนี้"}), 404
    return jsonify(row_to_dict(row))


@app.route("/api/menu", methods=["POST"])
def create_menu():
    """เพิ่มเมนูใหม่ — POST /api/menu"""
    data = request.get_json()
    if not data or not data.get("name") or not data.get("price"):
        return jsonify({"error": "กรุณาระบุ name และ price"}), 400

    db = get_db()
    cursor = db.execute("""
        INSERT INTO menu (name, name_jp, price, category, emoji, img_url, description, featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["name"],
        data.get("name_jp", ""),
        int(data["price"]),
        data.get("category", "nigiri"),
        data.get("emoji", "🍣"),
        data.get("img_url"),
        data.get("description", ""),
        1 if data.get("featured") else 0,
    ))
    db.commit()
    new_item = db.execute("SELECT * FROM menu WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(row_to_dict(new_item)), 201


@app.route("/api/menu/<int:menu_id>", methods=["PUT"])
def update_menu(menu_id):
    """แก้ไขเมนู — PUT /api/menu/1"""
    db  = get_db()
    row = db.execute("SELECT * FROM menu WHERE id = ?", (menu_id,)).fetchone()
    if not row:
        return jsonify({"error": "ไม่พบเมนูนี้"}), 404

    data = request.get_json()
    db.execute("""
        UPDATE menu
        SET name=?, name_jp=?, price=?, category=?, emoji=?, img_url=?,
            description=?, featured=?, updated_at=datetime('now','localtime')
        WHERE id=?
    """, (
        data.get("name",        row["name"]),
        data.get("name_jp",     row["name_jp"]),
        int(data.get("price",   row["price"])),
        data.get("category",    row["category"]),
        data.get("emoji",       row["emoji"]),
        data.get("img_url",     row["img_url"]),
        data.get("description", row["description"]),
        1 if data.get("featured", row["featured"]) else 0,
        menu_id,
    ))
    db.commit()
    updated = db.execute("SELECT * FROM menu WHERE id = ?", (menu_id,)).fetchone()
    return jsonify(row_to_dict(updated))


@app.route("/api/menu/<int:menu_id>", methods=["DELETE"])
def delete_menu(menu_id):
    """ลบเมนู (soft delete) — DELETE /api/menu/1"""
    db  = get_db()
    row = db.execute("SELECT * FROM menu WHERE id = ?", (menu_id,)).fetchone()
    if not row:
        return jsonify({"error": "ไม่พบเมนูนี้"}), 404

    db.execute("UPDATE menu SET available = 0 WHERE id = ?", (menu_id,))
    db.commit()
    return jsonify({"message": f"ลบเมนู '{row['name']}' แล้ว", "id": menu_id})

# ========== ROUTES: ORDERS ==========

@app.route("/api/orders", methods=["GET"])
def get_orders():
    """ดึงออเดอร์ทั้งหมด — GET /api/orders?status=pending"""
    db = get_db()
    query  = "SELECT * FROM orders"
    params = []

    status = request.args.get("status")
    if status:
        query += " WHERE status = ?"
        params.append(status)

    query += " ORDER BY created_at DESC"
    rows = db.execute(query, params).fetchall()
    orders = rows_to_list(rows)

    # ดึง items ของแต่ละออเดอร์
    for order in orders:
        items = db.execute(
            "SELECT * FROM order_items WHERE order_id = ?", (order["id"],)
        ).fetchall()
        order["items"] = rows_to_list(items)

    return jsonify(orders)


@app.route("/api/orders/<int:order_id>", methods=["GET"])
def get_order(order_id):
    """ดึงออเดอร์รายการเดียว — GET /api/orders/1"""
    db  = get_db()
    row = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if not row:
        return jsonify({"error": "ไม่พบออเดอร์นี้"}), 404

    order = row_to_dict(row)
    items = db.execute(
        "SELECT * FROM order_items WHERE order_id = ?", (order_id,)
    ).fetchall()
    order["items"] = rows_to_list(items)
    return jsonify(order)


@app.route("/api/orders", methods=["POST"])
def create_order():
    """สร้างออเดอร์ใหม่ — POST /api/orders
    
    Body JSON:
    {
      "customer_name": "สมชาย",
      "phone": "081-234-5678",
      "address": "123 ถ.สุขุมวิท กรุงเทพ",
      "note": "ไม่ใส่วาซาบิ",
      "payment": "cod",
      "items": [
        {"menu_id": 1, "name": "ซูชิแซลมอน", "price": 220, "qty": 2},
        {"menu_id": 3, "name": "มากิแตงกวา",  "price": 120, "qty": 1}
      ]
    }
    """
    data = request.get_json()
    required = ["customer_name", "phone", "address", "items"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"กรุณาระบุ {field}"}), 400

    if not data["items"]:
        return jsonify({"error": "ต้องมีสินค้าอย่างน้อย 1 รายการ"}), 400

    # คำนวณราคา
    subtotal     = sum(int(i["price"]) * int(i["qty"]) for i in data["items"])
    delivery_fee = 50
    total        = subtotal + delivery_fee

    # สร้างรหัสออเดอร์
    order_code = "TK" + datetime.now().strftime("%y%m%d%H%M%S")

    db = get_db()
    cursor = db.execute("""
        INSERT INTO orders (order_code, customer_name, phone, address, note,
                            payment, subtotal, delivery_fee, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        order_code,
        data["customer_name"],
        data["phone"],
        data["address"],
        data.get("note", ""),
        data.get("payment", "cod"),
        subtotal, delivery_fee, total,
    ))
    order_id = cursor.lastrowid

    # บันทึก order items
    for item in data["items"]:
        item_subtotal = int(item["price"]) * int(item["qty"])
        db.execute("""
            INSERT INTO order_items (order_id, menu_id, name, price, qty, subtotal)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            order_id,
            item.get("menu_id"),
            item["name"],
            int(item["price"]),
            int(item["qty"]),
            item_subtotal,
        ))

    db.commit()

    new_order = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    result    = row_to_dict(new_order)
    items_rows = db.execute(
        "SELECT * FROM order_items WHERE order_id = ?", (order_id,)
    ).fetchall()
    result["items"] = rows_to_list(items_rows)

    return jsonify(result), 201


@app.route("/api/orders/<int:order_id>/status", methods=["PATCH"])
def update_order_status(order_id):
    """อัพเดตสถานะออเดอร์ — PATCH /api/orders/1/status
    
    Body: {"status": "confirmed"} 
    สถานะ: pending → confirmed → preparing → delivering → completed | cancelled
    """
    db  = get_db()
    row = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if not row:
        return jsonify({"error": "ไม่พบออเดอร์นี้"}), 404

    data   = request.get_json()
    status = data.get("status")
    valid  = ["pending","confirmed","preparing","delivering","completed","cancelled"]
    if status not in valid:
        return jsonify({"error": f"สถานะไม่ถูกต้อง ต้องเป็น: {', '.join(valid)}"}), 400

    db.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    db.commit()
    return jsonify({"message": f"อัพเดตสถานะเป็น '{status}' แล้ว", "id": order_id, "status": status})

# ========== ROUTES: ADMIN AUTH ==========

@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    """Login แอดมิน — POST /api/admin/login
    
    Body: {"username": "admin", "password": "takumi2024"}
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "ไม่พบข้อมูล"}), 400

    db  = get_db()
    row = db.execute(
        "SELECT * FROM admins WHERE username = ? AND password = ?",
        (data.get("username"), data.get("password"))
    ).fetchone()

    if row:
        return jsonify({"success": True, "message": "เข้าสู่ระบบสำเร็จ", "username": row["username"]})
    else:
        return jsonify({"success": False, "error": "Username หรือ Password ไม่ถูกต้อง"}), 401

# ========== ROUTES: STATS (Dashboard) ==========

@app.route("/api/stats", methods=["GET"])
def get_stats():
    """สถิติภาพรวม — GET /api/stats"""
    db = get_db()

    total_menu   = db.execute("SELECT COUNT(*) FROM menu WHERE available=1").fetchone()[0]
    total_orders = db.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    total_revenue= db.execute("SELECT COALESCE(SUM(total),0) FROM orders WHERE status != 'cancelled'").fetchone()[0]
    pending      = db.execute("SELECT COUNT(*) FROM orders WHERE status='pending'").fetchone()[0]

    top_items = db.execute("""
        SELECT oi.name, SUM(oi.qty) as total_sold
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
        GROUP BY oi.name
        ORDER BY total_sold DESC
        LIMIT 5
    """).fetchall()

    return jsonify({
        "total_menu":    total_menu,
        "total_orders":  total_orders,
        "total_revenue": total_revenue,
        "pending_orders":pending,
        "top_selling":   rows_to_list(top_items),
    })

# ========== RUN ==========

if __name__ == "__main__":
    print("=" * 50)
    print("  🍣 TAKUMI SUSHI — Backend Server")
    print("=" * 50)
    init_db()
    print("🚀 Server รันที่ http://localhost:5000")
    print()
    print("📋 API Endpoints:")
    print("   GET    /api/menu              — ดูเมนูทั้งหมด")
    print("   POST   /api/menu              — เพิ่มเมนูใหม่")
    print("   PUT    /api/menu/<id>         — แก้ไขเมนู")
    print("   DELETE /api/menu/<id>         — ลบเมนู")
    print("   GET    /api/orders            — ดูออเดอร์ทั้งหมด")
    print("   POST   /api/orders            — สร้างออเดอร์ใหม่")
    print("   PATCH  /api/orders/<id>/status— อัพเดตสถานะ")
    print("   POST   /api/admin/login       — Admin login")
    print("   GET    /api/stats             — สถิติภาพรวม")
    print("=" * 50)
    app.run(debug=True, port=5000)
