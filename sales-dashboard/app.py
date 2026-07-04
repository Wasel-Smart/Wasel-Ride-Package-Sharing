import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta

# 1. Page Configuration
st.set_page_config(
    page_title="Sales Analytics Dashboard",
    page_icon="◆",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# 2. Theme State Management
if "theme" not in st.session_state:
    st.session_state.theme = "dark"

def toggle_theme():
    st.session_state.theme = "light" if st.session_state.theme == "dark" else "dark"

IS_DARK = st.session_state.theme == "dark"

# Define theme colors
BG = "#09090b" if IS_DARK else "#ffffff"
BG_SUBTLE = "#0c0c0f" if IS_DARK else "#f9fafb"
CARD = "#0c0c0f" if IS_DARK else "#ffffff"
CARD_HOVER = "#131316" if IS_DARK else "#f4f4f5"
BORDER = "#1e1e24" if IS_DARK else "#e4e4e7"
BORDER_SUBTLE = "#16161a" if IS_DARK else "#f0f0f2"
TEXT = "#fafafa" if IS_DARK else "#09090b"
TEXT_MUTED = "#71717a"
TEXT_DIM = "#52525b" if IS_DARK else "#a1a1aa"
ACCENT = "#2563eb"
ACCENT_MUTED = "#1d4ed8"
GREEN = "#22c55e" if IS_DARK else "#16a34a"
GREEN_MUTED = "rgba(34,197,94,0.12)" if IS_DARK else "rgba(22,163,74,0.08)"
RED = "#ef4444" if IS_DARK else "#dc2626"
RED_MUTED = "rgba(239,68,68,0.12)" if IS_DARK else "rgba(220,38,38,0.08)"
AMBER = "#f59e0b" if IS_DARK else "#d97706"
AMBER_MUTED = "rgba(245,158,11,0.12)" if IS_DARK else "rgba(217,119,6,0.08)"
SHADOW = "none" if IS_DARK else "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)"
RADIUS = "10px"

# Inject Global CSS
st.markdown(f"""
<style>
    /* Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap');
    
    /* Hide Streamlit Chrome */
    header[data-testid="stHeader"], #MainMenu, footer, [data-testid="stToolbar"],
    [data-testid="stDecoration"], [data-testid="stStatusWidget"], .stDeployButton,
    div[data-testid="stSidebarCollapsedControl"] {{
        display: none !important;
    }}
    
    /* Global App Container */
    html, body, [data-testid="stAppViewContainer"], [data-testid="stApp"], .main, .block-container, section[data-testid="stMain"] {{
        background-color: {BG} !important;
        color: {TEXT} !important;
        font-family: 'DM Sans', -apple-system, sans-serif !important;
    }}
    .block-container {{
        padding: 1.5rem 2rem 2.5rem !important;
        max-width: 1360px !important;
        margin: 0 auto;
    }}
    
    /* Brand Header */
    .brand-container {{
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }}
    .brand {{
        display: flex;
        align-items: center;
        gap: 8px;
    }}
    .brand-logo {{
        font-size: 1.5rem;
        color: {ACCENT};
        font-weight: 800;
    }}
    .brand-name {{
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: {TEXT};
    }}
    
    /* Metric Cards */
    .metric-grid {{
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }}
    .metric-card {{
        background: {CARD};
        border: 1px solid {BORDER};
        border-radius: {RADIUS};
        padding: 1.25rem 1.4rem;
        box-shadow: {SHADOW};
        transition: transform 0.2s ease, border-color 0.2s ease;
    }}
    .metric-card:hover {{
        border-color: {ACCENT};
        background: {CARD_HOVER};
    }}
    .metric-label {{
        font-size: 0.78rem;
        color: {TEXT_MUTED};
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }}
    .metric-value {{
        font-size: 1.75rem;
        font-weight: 700;
        color: {TEXT};
        letter-spacing: -0.03em;
        margin-top: 0.2rem;
        font-family: 'JetBrains Mono', monospace;
    }}
    .metric-delta {{
        font-size: 0.72rem;
        font-weight: 500;
        margin-top: 0.4rem;
        padding: 2px 8px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        gap: 3px;
    }}
    .delta-up {{ color: {GREEN}; background: {GREEN_MUTED}; }}
    .delta-down {{ color: {RED}; background: {RED_MUTED}; }}
    .delta-warn {{ color: {AMBER}; background: {AMBER_MUTED}; }}
    
    /* Visualizations Cards */
    .chart-wrap {{
        background: {CARD};
        border: 1px solid {BORDER};
        border-radius: {RADIUS};
        padding: 1.2rem;
        box-shadow: {SHADOW};
        margin-bottom: 1rem;
        transition: border-color 0.2s ease;
    }}
    .chart-wrap:hover {{
        border-color: {ACCENT}55;
    }}
    .chart-header {{
        margin-bottom: 0.8rem;
    }}
    .chart-title {{
        font-size: 0.88rem;
        font-weight: 600;
        color: {TEXT};
    }}
    .chart-subtitle {{
        font-size: 0.72rem;
        color: {TEXT_DIM};
    }}
    
    /* Pill Tabs styling */
    button[data-baseweb="tab"] {{
        background: transparent !important;
        color: {TEXT_MUTED} !important;
        font-size: 0.85rem !important;
        font-weight: 500 !important;
        padding: 0.5rem 1.2rem !important;
        border: 1px solid transparent !important;
        border-radius: 7px !important;
        transition: all 0.2s ease !important;
    }}
    button[data-baseweb="tab"][aria-selected="true"] {{
        color: {TEXT} !important;
        background: {CARD} !important;
        border-color: {BORDER} !important;
        box-shadow: {SHADOW} !important;
    }}
    [data-baseweb="tab-highlight"], [data-baseweb="tab-border"] {{
        display: none !important;
    }}
    [data-baseweb="tab-list"] {{
        gap: 6px !important;
        background: {BG_SUBTLE} !important;
        border: 1px solid {BORDER} !important;
        border-radius: 10px !important;
        padding: 4px !important;
        margin-bottom: 1.5rem !important;
    }}
    
    /* Data Tables */
    .table-container {{
        background: {CARD};
        border: 1px solid {BORDER};
        border-radius: {RADIUS};
        overflow: hidden;
        margin-top: 1rem;
    }}
    .data-table {{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 0.8rem;
    }}
    .data-table th {{
        text-align: left;
        padding: 0.8rem 1rem;
        color: {TEXT_MUTED};
        font-weight: 600;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid {BORDER};
        background: {BG_SUBTLE};
    }}
    .data-table td {{
        padding: 0.8rem 1rem;
        color: {TEXT};
        border-bottom: 1px solid {BORDER_SUBTLE};
        vertical-align: middle;
    }}
    .data-table tr:last-child td {{
        border-bottom: none;
    }}
    .data-table tr:hover td {{
        background: {CARD_HOVER};
    }}
    
    /* Badges */
    .badge {{
        display: inline-block;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.02em;
    }}
    .badge-green {{ color: {GREEN}; background: {GREEN_MUTED}; }}
    .badge-red {{ color: {RED}; background: {RED_MUTED}; }}
    .badge-amber {{ color: {AMBER}; background: {AMBER_MUTED}; }}
    .badge-blue {{ color: {ACCENT}; background: rgba(37,99,235,0.1); }}
    
    /* Layout Overrides */
    [data-testid="stHorizontalBlock"] {{
        gap: 1.25rem !important;
    }}
    
    /* Filter Bar Container */
    .filter-bar {{
        background: {BG_SUBTLE};
        border: 1px solid {BORDER};
        border-radius: {RADIUS};
        padding: 1rem;
        margin-bottom: 1.5rem;
    }}
</style>
""", unsafe_allow_html=True)

# 3. Helper Functions
def metric_card(label, value, delta=None, delta_type="up"):
    cls = f"delta-{delta_type}"
    arrow = "↑" if delta_type == "up" else ("↓" if delta_type == "down" else "→")
    delta_html = f'<div class="metric-delta {cls}">{arrow} {delta}</div>' if delta else ""
    return f"""
    <div class="metric-card">
        <div class="metric-label">{label}</div>
        <div class="metric-value">{value}</div>
        {delta_html}
    </div>
    """

# Plotly styling utility
PLOT_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="DM Sans, sans-serif", color="#71717a" if not IS_DARK else "#a1a1aa", size=11),
    margin=dict(l=40, r=20, t=20, b=40),
    xaxis=dict(
        gridcolor="rgba(0,0,0,0.04)" if not IS_DARK else "rgba(255,255,255,0.04)",
        zerolinecolor="rgba(0,0,0,0.04)" if not IS_DARK else "rgba(255,255,255,0.04)",
        tickfont=dict(size=10, color="#71717a"),
    ),
    yaxis=dict(
        gridcolor="rgba(0,0,0,0.04)" if not IS_DARK else "rgba(255,255,255,0.04)",
        zerolinecolor="rgba(0,0,0,0.04)" if not IS_DARK else "rgba(255,255,255,0.04)",
        tickfont=dict(size=10, color="#71717a"),
    ),
)

# 4. Generate Mock Data
@st.cache_data
def load_mock_data():
    np.random.seed(42)
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2026, 6, 30)
    days = (end_date - start_date).days
    
    dates = [start_date + timedelta(days=np.random.randint(0, days)) for _ in range(250)]
    
    products = {
        "Electronics": [
            ("Wireless Headphones", 120.00),
            ("Smart Watch", 250.00),
            ("Bluetooth Speaker", 85.00),
            ("USB-C Hub", 45.00),
        ],
        "Accessories": [
            ("Leather Wallet", 60.00),
            ("Laptop Sleeve", 35.00),
            ("Travel Backpack", 95.00),
            ("Minimalist Keychain", 15.00),
        ],
        "Furniture": [
            ("Ergonomic Chair", 320.00),
            ("Standing Desk", 450.00),
            ("Monitor Arm", 80.00),
            ("Desk Organizer", 25.00),
        ]
    }
    
    regions = ["Amman", "Irbid", "Zarqa", "Aqaba"]
    payment_methods = ["CliQ", "Credit Card", "Cash on Delivery", "Apple Pay"]
    statuses = ["Completed", "Completed", "Completed", "Pending", "Refunded"]
    
    data = []
    for i, date in enumerate(dates):
        category = np.random.choice(list(products.keys()))
        prod_tuple = products[category][np.random.randint(0, len(products[category]))]
        product_name = prod_tuple[0]
        unit_price = prod_tuple[1]
        quantity = np.random.randint(1, 4)
        revenue = quantity * unit_price
        region = np.random.choice(regions)
        payment = np.random.choice(payment_methods)
        status = np.random.choice(statuses, p=[0.85, 0.05, 0.05, 0.03, 0.02])
        
        data.append({
            "Order ID": f"ORD-{1000 + i}",
            "Date": date,
            "Product": product_name,
            "Category": category,
            "Quantity": quantity,
            "Unit Price": unit_price,
            "Revenue": revenue,
            "Region": region,
            "Payment Method": payment,
            "Status": status
        })
        
    df = pd.DataFrame(data)
    df["Date"] = pd.to_datetime(df["Date"])
    return df.sort_values(by="Date").reset_index(drop=True)

# Smart CSV Column Detector
def parse_custom_csv(uploaded_file):
    try:
        df = pd.read_csv(uploaded_file)
        
        # Clean column names
        df.columns = [col.strip() for col in df.columns]
        
        col_mappings = {}
        
        # Search patterns for key columns
        patterns = {
            "Date": ["date", "time", "created_at", "timestamp"],
            "Product": ["product", "item", "title", "name"],
            "Category": ["category", "type", "class", "genre"],
            "Quantity": ["qty", "quantity", "count", "units"],
            "Unit Price": ["unit_price", "price", "rate", "cost"],
            "Revenue": ["revenue", "sales", "amount", "total", "net_amount"],
            "Region": ["region", "city", "state", "location", "territory"],
            "Payment Method": ["payment", "method", "pay_type", "type"],
            "Status": ["status", "state", "outcome"]
        }
        
        for key, aliases in patterns.items():
            for alias in aliases:
                # Direct match case-insensitive
                matches = [col for col in df.columns if alias.lower() in col.lower()]
                if matches:
                    col_mappings[key] = matches[0]
                    break
        
        # Check standard defaults if some columns weren't matched
        final_data = {}
        for canonical, source in col_mappings.items():
            final_data[canonical] = df[source]
            
        # Fallbacks for missing columns
        if "Date" not in final_data:
            # Look for any datetime column
            date_cols = [c for c in df.columns if "date" in c.lower() or df[c].dtype == "datetime64[ns]"]
            if date_cols:
                final_data["Date"] = pd.to_datetime(df[date_cols[0]])
            else:
                # Generate mock dates
                final_data["Date"] = pd.date_range(start="2025-01-01", periods=len(df), freq="D")
        else:
            final_data["Date"] = pd.to_datetime(final_data["Date"])
            
        if "Revenue" not in final_data:
            if "Quantity" in final_data and "Unit Price" in final_data:
                final_data["Revenue"] = final_data["Quantity"].astype(float) * final_data["Unit Price"].astype(float)
            else:
                # Try finding any numerical column
                num_cols = df.select_dtypes(include=[np.number]).columns
                if len(num_cols) > 0:
                    final_data["Revenue"] = df[num_cols[0]]
                else:
                    final_data["Revenue"] = np.random.uniform(10, 500, len(df))
        else:
            final_data["Revenue"] = final_data["Revenue"].astype(float)
            
        # Defaults for other columns
        if "Product" not in final_data:
            final_data["Product"] = df.select_dtypes(include=["object"]).columns[0] if len(df.select_dtypes(include=["object"]).columns) > 0 else "Product A"
        if "Category" not in final_data:
            final_data["Category"] = "General"
        if "Quantity" not in final_data:
            final_data["Quantity"] = 1
        if "Unit Price" not in final_data:
            final_data["Unit Price"] = final_data["Revenue"] / final_data["Quantity"]
        if "Region" not in final_data:
            final_data["Region"] = "Online"
        if "Payment Method" not in final_data:
            final_data["Payment Method"] = "Direct"
        if "Status" not in final_data:
            final_data["Status"] = "Completed"
            
        # Order ID
        final_data["Order ID"] = [f"ORD-{1000 + idx}" for idx in range(len(df))]
        
        parsed_df = pd.DataFrame(final_data)
        return parsed_df.sort_values(by="Date").reset_index(drop=True), None
    except Exception as e:
        return None, str(e)

# 5. Header Component
header_left, header_right = st.columns([7, 2])
with header_left:
    st.markdown(f"""
    <div class="brand">
        <span class="brand-logo">◆</span>
        <span class="brand-name">Sales Intelligence Portal</span>
    </div>
    """, unsafe_allow_html=True)
with header_right:
    theme_btn_text = "☀️ Light View" if IS_DARK else "🌙 Dark View"
    st.button(theme_btn_text, on_click=toggle_theme, use_container_width=True)

# 6. CSV File Upload Bar
st.markdown('<div class="chart-wrap">', unsafe_allow_html=True)
upload_c1, upload_c2 = st.columns([7, 3])
with upload_c1:
    uploaded_file = st.file_uploader("Upload your sales CSV file below to customize the dashboard analytics:", type=["csv"])
with upload_c2:
    st.markdown("""
    <div style="font-size: 0.72rem; color: #71717a; margin-top: 1.5rem; line-height: 1.4;">
        <strong>Dynamic Column Parsing:</strong> Our uploader maps column fields such as <em>Date, Revenue, Products, Category, Region</em>, and <em>Payment Method</em> automatically. If fields are missing, sensible defaults are calculated.
    </div>
    """, unsafe_allow_html=True)
st.markdown('</div>', unsafe_allow_html=True)

# Load data based on upload state
if uploaded_file is not None:
    raw_df, err = parse_custom_csv(uploaded_file)
    if err:
        st.error(f"Error parsing uploaded file: {err}. Using default mock dataset instead.")
        raw_df = load_mock_data()
    else:
        st.success("Successfully parsed uploaded CSV file!")
else:
    raw_df = load_mock_data()

# 7. Sidebar-Free Filters Container
st.markdown('<div class="filter-bar">', unsafe_allow_html=True)
fc1, fc2, fc3, fc4 = st.columns(4)

with fc1:
    min_date = raw_df["Date"].min().date()
    max_date = raw_df["Date"].max().date()
    date_range = st.date_input("Date Range", [min_date, max_date], min_value=min_date, max_value=max_date)

with fc2:
    categories = ["All Categories"] + sorted(raw_df["Category"].unique().tolist())
    selected_cat = st.selectbox("Category Filter", categories)

with fc3:
    regions = ["All Regions"] + sorted(raw_df["Region"].unique().tolist())
    selected_region = st.selectbox("Region Filter", regions)

with fc4:
    payments = ["All Payment Methods"] + sorted(raw_df["Payment Method"].unique().tolist())
    selected_payment = st.selectbox("Payment Filter", payments)
st.markdown('</div>', unsafe_allow_html=True)

# Filter Logic
filtered_df = raw_df.copy()

# Date range filter check
if isinstance(date_range, (list, tuple)) and len(date_range) == 2:
    start_dt, end_dt = pd.to_datetime(date_range[0]), pd.to_datetime(date_range[1]) + timedelta(days=1)
    filtered_df = filtered_df[(filtered_df["Date"] >= start_dt) & (filtered_df["Date"] < end_dt)]

if selected_cat != "All Categories":
    filtered_df = filtered_df[filtered_df["Category"] == selected_cat]

if selected_region != "All Regions":
    filtered_df = filtered_df[filtered_df["Region"] == selected_region]

if selected_payment != "All Payment Methods":
    filtered_df = filtered_df[filtered_df["Payment Method"] == selected_payment]

# 8. Dynamic Dashboard Tabs
tab_summary, tab_charts, tab_data = st.tabs(["Overview Dashboard", "Analytics & Insights", "Raw Data Explorer"])

with tab_summary:
    # 8a. KPI Row Calculation
    if len(filtered_df) > 0:
        total_rev = filtered_df["Revenue"].sum()
        total_orders = len(filtered_df)
        aov = total_rev / total_orders if total_orders > 0 else 0
        total_qty = filtered_df["Quantity"].sum()
        
        # Calculate monthly growth deltas for the mock dashboard or uploaded dataset
        half_idx = len(filtered_df) // 2
        first_half = filtered_df.iloc[:half_idx]
        second_half = filtered_df.iloc[half_idx:]
        
        rev_delta = 0
        if len(first_half) > 0 and second_half["Revenue"].sum() > 0:
            rev_delta = ((second_half["Revenue"].sum() - first_half["Revenue"].sum()) / first_half["Revenue"].sum()) * 100
        
        order_delta = 0
        if len(first_half) > 0 and len(second_half) > 0:
            order_delta = ((len(second_half) - len(first_half)) / len(first_half)) * 100
    else:
        total_rev, total_orders, aov, total_qty, rev_delta, order_delta = 0, 0, 0, 0, 0, 0

    # Format values
    fmt_rev = f"${total_rev:,.2f}"
    fmt_orders = f"{total_orders:,}"
    fmt_aov = f"${aov:,.2f}"
    fmt_qty = f"{total_qty:,}"
    
    # Delta types
    rev_delta_type = "up" if rev_delta >= 0 else "down"
    order_delta_type = "up" if order_delta >= 0 else "down"
    
    # Render KPI Cards
    kpi_cols = st.columns(4)
    with kpi_cols[0]:
        st.markdown(metric_card("Total Revenue", fmt_rev, f"{abs(rev_delta):.1f}% vs past period", rev_delta_type), unsafe_allow_html=True)
    with kpi_cols[1]:
        st.markdown(metric_card("Total Orders", fmt_orders, f"{abs(order_delta):.1f}% vs past period", order_delta_type), unsafe_allow_html=True)
    with kpi_cols[2]:
        st.markdown(metric_card("Average Order Value (AOV)", fmt_aov, "AOV metric", "warn" if aov < 100 else "up"), unsafe_allow_html=True)
    with kpi_cols[3]:
        st.markdown(metric_card("Items Sold", fmt_qty, "Total unit items"), unsafe_allow_html=True)
        
    st.markdown('<div style="height: 1rem;"></div>', unsafe_allow_html=True)

    # 8b. Primary Visualizations Row
    col_l, col_r = st.columns([7, 3])
    
    with col_l:
        st.markdown("""
        <div class="chart-wrap">
            <div class="chart-header">
                <div class="chart-title">Revenue Trend Analysis</div>
                <div class="chart-subtitle">Daily and cumulative sales performance across selected filters</div>
            </div>
        """, unsafe_allow_html=True)
        
        if len(filtered_df) > 0:
            trend_df = filtered_df.groupby("Date")["Revenue"].sum().reset_index()
            trend_df["Cumulative Revenue"] = trend_df["Revenue"].cumsum()
            
            fig_trend = go.Figure()
            # Daily Bar
            fig_trend.add_trace(go.Bar(
                x=trend_df["Date"], 
                y=trend_df["Revenue"], 
                name="Daily Revenue",
                marker_color="#2563eb",
                opacity=0.45
            ))
            # Cumulative Trend Line
            fig_trend.add_trace(go.Scatter(
                x=trend_df["Date"], 
                y=trend_df["Cumulative Revenue"], 
                name="Cumulative",
                line=dict(color="#22c55e", width=2.5)
            ))
            
            fig_trend.update_layout(**PLOT_LAYOUT)
            fig_trend.update_layout(
                legend=dict(orientation="h", ylink=1.05, y=1.05, x=0, font=dict(size=10)),
                height=320,
            )
            st.plotly_chart(fig_trend, use_container_width=True, config={"displayModeBar": False})
        else:
            st.info("No data available for the selected filters.")
            
        st.markdown("</div>", unsafe_allow_html=True)
        
    with col_r:
        st.markdown("""
        <div class="chart-wrap">
            <div class="chart-header">
                <div class="chart-title">Product Category Breakdown</div>
                <div class="chart-subtitle">Share of total revenue by product category</div>
            </div>
        """, unsafe_allow_html=True)
        
        if len(filtered_df) > 0:
            cat_df = filtered_df.groupby("Category")["Revenue"].sum().reset_index()
            fig_cat = px.pie(
                cat_df, 
                values="Revenue", 
                names="Category", 
                hole=0.58,
                color_discrete_sequence=["#2563eb", "#22c55e", "#f59e0b", "#a1a1aa"]
            )
            fig_cat.update_layout(**PLOT_LAYOUT)
            fig_cat.update_traces(textposition='inside', textinfo='percent+label', showlegend=False)
            fig_cat.update_layout(height=320, margin=dict(l=10, r=10, t=10, b=10))
            st.plotly_chart(fig_cat, use_container_width=True, config={"displayModeBar": False})
        else:
            st.info("No data available.")
            
        st.markdown("</div>", unsafe_allow_html=True)

    # 8c. Secondary Visualizations & Top Products Row
    sub_l, sub_r = st.columns([6, 4])
    
    with sub_l:
        st.markdown("""
        <div class="chart-wrap">
            <div class="chart-header">
                <div class="chart-title">Top Selling Products</div>
                <div class="chart-subtitle">Ranked by revenue generation</div>
            </div>
        """, unsafe_allow_html=True)
        
        if len(filtered_df) > 0:
            prod_df = filtered_df.groupby("Product")["Revenue"].sum().reset_index().sort_values(by="Revenue", ascending=True).tail(5)
            fig_prod = px.bar(
                prod_df, 
                x="Revenue", 
                y="Product", 
                orientation="h",
                color_discrete_sequence=["#2563eb"]
            )
            fig_prod.update_layout(**PLOT_LAYOUT)
            fig_prod.update_traces(marker_color="#2563eb", width=0.55)
            fig_prod.update_layout(height=280)
            st.plotly_chart(fig_prod, use_container_width=True, config={"displayModeBar": False})
        else:
            st.info("No data available.")
            
        st.markdown("</div>", unsafe_allow_html=True)
        
    with sub_r:
        st.markdown("""
        <div class="chart-wrap">
            <div class="chart-header">
                <div class="chart-title">Regional Performance</div>
                <div class="chart-subtitle">Revenue distribution by region</div>
            </div>
        """, unsafe_allow_html=True)
        
        if len(filtered_df) > 0:
            reg_df = filtered_df.groupby("Region")["Revenue"].sum().reset_index().sort_values(by="Revenue", ascending=False)
            fig_reg = px.bar(
                reg_df, 
                x="Region", 
                y="Revenue",
                color_discrete_sequence=["#f59e0b"]
            )
            fig_reg.update_layout(**PLOT_LAYOUT)
            fig_reg.update_traces(marker_color="#f59e0b", width=0.45)
            fig_reg.update_layout(height=280)
            st.plotly_chart(fig_reg, use_container_width=True, config={"displayModeBar": False})
        else:
            st.info("No data available.")
            
        st.markdown("</div>", unsafe_allow_html=True)

with tab_charts:
    # Advanced insights
    st.markdown("### Deep Dive & Correlation Analysis")
    
    det_c1, det_c2 = st.columns(2)
    
    with det_c1:
        st.markdown("""
        <div class="chart-wrap">
            <div class="chart-header">
                <div class="chart-title">Revenue Contribution by Payment Method</div>
                <div class="chart-subtitle">Analyzing customer checkout preferences</div>
            </div>
        """, unsafe_allow_html=True)
        
        if len(filtered_df) > 0:
            pay_df = filtered_df.groupby("Payment Method")["Revenue"].sum().reset_index()
            fig_pay = px.bar(
                pay_df,
                y="Payment Method",
                x="Revenue",
                orientation="h",
                color_discrete_sequence=["#22c55e"]
            )
            fig_pay.update_layout(**PLOT_LAYOUT)
            fig_pay.update_layout(height=320)
            st.plotly_chart(fig_pay, use_container_width=True, config={"displayModeBar": False})
        else:
            st.info("No data available.")
        st.markdown("</div>", unsafe_allow_html=True)
        
    with det_c2:
        st.markdown("""
        <div class="chart-wrap">
            <div class="chart-header">
                <div class="chart-title">Order Status Analysis</div>
                <div class="chart-subtitle">Order distribution based on payment and shipping status</div>
            </div>
        """, unsafe_allow_html=True)
        
        if len(filtered_df) > 0:
            status_df = filtered_df.groupby("Status")["Order ID"].count().reset_index().rename(columns={"Order ID": "Count"})
            fig_status = px.pie(
                status_df,
                values="Count",
                names="Status",
                color_discrete_sequence=["#22c55e", "#2563eb", "#ef4444", "#a1a1aa"]
            )
            fig_status.update_layout(**PLOT_LAYOUT)
            fig_status.update_layout(height=320)
            st.plotly_chart(fig_status, use_container_width=True, config={"displayModeBar": False})
        else:
            st.info("No data available.")
        st.markdown("</div>", unsafe_allow_html=True)

with tab_data:
    st.markdown("### Raw Sales Records")
    st.write("Browse, search, and download your filtered sales data below:")
    
    if len(filtered_df) > 0:
        # Search filter
        search_query = st.text_input("Search products, orders or categories...", "")
        
        display_df = filtered_df.copy()
        if search_query:
            display_df = display_df[
                display_df["Product"].str.contains(search_query, case=False) |
                display_df["Category"].str.contains(search_query, case=False) |
                display_df["Order ID"].str.contains(search_query, case=False)
            ]
            
        # Download button
        csv_data = display_df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Download Filtered CSV",
            data=csv_data,
            file_name=f"filtered_sales_data_{datetime.now().strftime('%Y%m%d')}.csv",
            mime="text/csv",
            use_container_width=True
        )
        
        # Elegant HTML Table for the top 50 matches to keep performance super high
        st.markdown('<div class="table-container">', unsafe_allow_html=True)
        
        # Build rows
        rows_html = ""
        for idx, row in display_df.head(50).iterrows():
            badge_class = "badge-green"
            if row["Status"] == "Pending":
                badge_class = "badge-amber"
            elif row["Status"] == "Refunded":
                badge_class = "badge-red"
            
            rows_html += f"""
            <tr>
                <td style="font-family: 'JetBrains Mono', monospace; font-weight: 500;">{row["Order ID"]}</td>
                <td>{row["Date"].strftime('%b %d, %Y')}</td>
                <td style="font-weight: 600;">{row["Product"]}</td>
                <td>{row["Category"]}</td>
                <td style="font-family: 'JetBrains Mono', monospace;">{row["Quantity"]}</td>
                <td style="font-family: 'JetBrains Mono', monospace;">${row["Unit Price"]:.2f}</td>
                <td style="font-family: 'JetBrains Mono', monospace; font-weight: 600;">${row["Revenue"]:.2f}</td>
                <td>{row["Region"]}</td>
                <td>{row["Payment Method"]}</td>
                <td><span class="badge {badge_class}">{row["Status"]}</span></td>
            </tr>
            """
            
        st.markdown(f"""
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total Revenue</th>
                    <th>Region</th>
                    <th>Payment</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
        """, unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)
        
        if len(display_df) > 50:
            st.markdown(f"""
            <div style="font-size: 0.72rem; color: #71717a; text-align: center; margin-top: 1rem;">
                Showing top 50 of {len(display_df)} matching orders. Download the CSV above to view all records.
            </div>
            """, unsafe_allow_html=True)
    else:
        st.warning("No records matched the current search or filters.")
