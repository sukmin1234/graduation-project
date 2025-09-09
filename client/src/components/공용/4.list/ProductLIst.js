import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Header from "../1.header/Header";
import Footer from "../3.footer/Footer";
import css from "./../../../css/ProductList.scss";
import {
  FaHeart,
  FaRegHeart,
  FaInfoCircle,
  FaTimes,
  FaClock,
  FaPhone,
  FaMapMarkerAlt,
  FaStar,
} from "react-icons/fa";
import no_img from "../../../images/icon/no-image.jpg";

function ProductList() {
  const location = useLocation();
  const store = location.state?.store;
  const categoryType =
    location.state?.categoryType || store?.type || "restaurant";

  const [isFavorite, setIsFavorite] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [restaurantData, setRestaurantData] = useState(null);
  const [hoursData, setHoursData] = useState([]);
  const [naverMenuData, setNaverMenuData] = useState([]);
  const [naverMenuGroupsData, setNaverMenuGroupsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHours, setIsLoadingHours] = useState(true);
  const [routeTime, setRouteTime] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // 최근 본 기록 (localStorage 저장)
  useEffect(() => {
    if (!store) return;

    const recentViews = JSON.parse(localStorage.getItem("recent_views")) || [];
    const filteredViews = recentViews.filter(
      (item) => item.place_id !== store.place_id
    );

    const newRecentViews = [
      {
        place_id: store.place_id,
        place_name: store.place_name,
        thumbnail: store.thumbnail || no_img,
        category: store.category,
        viewed_at: new Date().toISOString(),
      },
      ...filteredViews,
    ];

    localStorage.setItem(
      "recent_views",
      JSON.stringify(newRecentViews.slice(0, 10))
    );
  }, [store]);

  // 사용자 ID 가져오기
  const getUserId = () =>
    localStorage.getItem("user_id") || localStorage.getItem("guest_id");

  // 사용자 활동 기록 함수
  const recordUserAction = async (actionType) => {
    try {
      const userId = getUserId();
      const placeId = store?.place_id;
      if (!userId || !placeId) return;

      const endpoint =
        categoryType === "activity"
          ? "http://localhost:5000/api/action/activity"
          : "http://localhost:5000/api/action/restaurant";

      const response = await axios.post(
        `${endpoint}?user_id=${userId}&place_id=${placeId}&action_type=${actionType}`,
        {},
        { withCredentials: true }
      );

      console.log(`${actionType} action recorded:`, response.data);
    } catch (error) {
      console.error(`Error recording ${actionType} action:`, error);
    }
  };

  const recordLikeAction = async (isLiked) => {
    const actionType = isLiked ? "like" : "dislike";
    await recordUserAction(actionType);
  };

  // API 호출 함수들
  const fetchRestaurantData = async (placeId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/restaurant/${placeId}`
      );
      return response.data;
    } catch (error) {
      console.error("Restaurant data fetch error:", error);
      return null;
    }
  };

  const fetchRestaurantHours = async (placeId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/restaurant/${placeId}/hours`
      );
      return response.data || [];
    } catch (error) {
      console.error("Hours data fetch error:", error);
      return [];
    }
  };

  const fetchNaverMenu = async (placeId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/menu/menu?place_id=${placeId}`
      );
      return response.data || [];
    } catch (error) {
      console.error("Naver menu fetch error:", error);
      return [];
    }
  };

  const fetchNaverMenuGroups = async (placeId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/menu/menuGroups?place_id=${placeId}`
      );
      return response.data || [];
    } catch (error) {
      console.error("Naver menu groups fetch error:", error);
      return [];
    }
  };

  // 네이버 지도 웹 열기
  const openNaverMapWithoutLocation = () => {
    const storeLat =
      restaurantData?.restaurant?.lat || store?.latitude || store?.lat;
    const storeLng =
      restaurantData?.restaurant?.lng || store?.longitude || store?.lng;

    if (!storeLat || !storeLng) {
      alert("가게 위치 정보가 없습니다.");
      return;
    }

    const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(
      store.place_name
    )}/place/${storeLng},${storeLat}`;
    window.open(naverMapUrl, "_blank", "noopener,noreferrer");
  };

  // 데이터 로딩 (여기서 view 액션 기록)
  useEffect(() => {
    const loadData = async () => {
      if (!store?.place_id) return;

      setIsLoading(true);
      try {
        const isRestaurant = categoryType !== "activity";

        const promises = [
          isRestaurant
            ? fetchRestaurantData(store.place_id)
            : Promise.resolve(null),
          isRestaurant
            ? fetchRestaurantHours(store.place_id)
            : Promise.resolve([]),
        ];

        if (isRestaurant) {
          promises.push(fetchNaverMenu(store.place_id));
          promises.push(fetchNaverMenuGroups(store.place_id));
        } else {
          promises.push(Promise.resolve([]));
          promises.push(Promise.resolve([]));
        }

        const [restaurant, hours, menu, menuGroups] = await Promise.all(
          promises
        );

        setRestaurantData(restaurant);
        setHoursData(hours);
        setNaverMenuData(menu);
        setNaverMenuGroupsData(menuGroups);

        // ✅ 페이지 들어올 때 view 저장
        await recordUserAction("view");
      } catch (error) {
        console.error("Data loading error:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingHours(false);
      }
    };

    loadData();
  }, [store?.place_id, categoryType]);

  // 찜 상태 확인
  useEffect(() => {
    if (store?.place_id) {
      const favorites =
        JSON.parse(localStorage.getItem("myfavorites")) || [];
      setIsFavorite(
        favorites.some((fav) => fav.place_id === store.place_id)
      );
    }
  }, [store?.place_id]);

  const toggleFavorite = async () => {
    const favorites =
      JSON.parse(localStorage.getItem("myfavorites")) || [];
    const newFavoriteState = !isFavorite;

    if (newFavoriteState) {
      const newFavorite = {
        place_id: store.place_id,
        place_name: store.place_name,
        thumbnail: store.thumbnail,
        category: store.category,
        reviewCount: store.reviewCount,
        type: categoryType,
      };
      localStorage.setItem(
        "myfavorites",
        JSON.stringify([...favorites, newFavorite])
      );
      await recordLikeAction(true);
    } else {
      const updatedFavorites = favorites.filter(
        (fav) => fav.place_id !== store.place_id
      );
      localStorage.setItem("myfavorites", JSON.stringify(updatedFavorites));
      await recordLikeAction(false);
    }

    setIsFavorite(newFavoriteState);
  };

  // 상세정보 클릭 시 click 액션 저장
  const handleOpenHoursModal = async () => {
    setShowHoursModal(true);
    await recordUserAction("click");
  };

  // 메뉴 통합
  const integratedMenu = () => {
    if (categoryType === "activity") return [];

    let allMenus = [];

    if (restaurantData?.menu && Array.isArray(restaurantData.menu)) {
      allMenus.push(
        ...restaurantData.menu.map((item) => ({
          menu_id:
            item.menu_id ||
            `db-${item.menu_name}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
          menu_name: item.menu_name,
          menu_price: item.menu_price,
          image_url: item.image_url,
          description: item.description,
          source: "naver_place",
        }))
      );
    }

    if (Array.isArray(naverMenuData)) {
      allMenus.push(
        ...naverMenuData.map((item) => ({
          menu_id:
            item.menu_id ||
            `naver-${item.menu_name}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
          menu_name: item.menu_name,
          menu_price: item.menu_price,
          image_url: item.image_url,
          description: item.description,
          source: "naver_order",
        }))
      );
    }

    if (Array.isArray(naverMenuGroupsData)) {
      const flattenedMenus = naverMenuGroupsData.map((item) => ({
        menu_id:
          item.menu_id ||
          `group-${item.menu_name}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
        menu_name: item.menu_name,
        menu_price: item.menu_price,
        image_url: item.image_url,
        description: item.description,
        source: "naver_order_group",
      }));
      allMenus.push(...flattenedMenus);
    }

    const uniqueMenus = allMenus.reduce((acc, current) => {
      const exists = acc.find(
        (item) =>
          item.menu_name === current.menu_name &&
          item.menu_price === current.menu_price
      );
      if (!exists) acc.push(current);
      else if (current.image_url && !exists.image_url) {
        acc[acc.indexOf(exists)] = current;
      }
      return acc;
    }, []);

    return uniqueMenus;
  };

  const menu = integratedMenu();
  const isActivity = categoryType === "activity";

  if (!store) return <p>정보를 불러올 수 없습니다.</p>;

  return (
    <>
      <Header />
      <div className="section">
        <div className="info_wrap">
          <div className="store_img_frame">
            {store.thumbnail ? (
              <img src={store.thumbnail} alt={store.place_name} />
            ) : (
              "이미지 없음"
            )}
            <button
              onClick={toggleFavorite}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "24px",
                color: isFavorite ? "red" : "white",
              }}
            >
              {isFavorite ? <FaHeart /> : <FaRegHeart />}
            </button>
          </div>
          <div className="store_info">
            <h2>{store.place_name}</h2>
            <p>
              {Array.isArray(store.category)
                ? store.category.join(", ")
                : store.category || ""}{" "}
              /{" "}
              <span>
                리뷰{" "}
                {restaurantData?.restaurant?.review_count ||
                  store.reviewCount ||
                  0}
                개
              </span>
            </p>
            <button onClick={handleOpenHoursModal} className="hours-button">
              <FaClock /> 상세 정보
            </button>
          </div>
        </div>

        {/* activity/restaurant 구분 */}
        {isActivity ? (
          <div className="activity_wrap">
            <h2>활동 정보</h2>
            <p>이 곳에서 즐길 수 있는 다양한 활동</p>
            {store.description && (
              <div className="activity_description">
                <p>{store.description}</p>
              </div>
            )}
            {(!store.list || store.list.length === 0) && (
              <p>정보가 없습니다.</p>
            )}
            {store.list && store.list.length > 0 && (
              <ul>
                {store.list.map((item, index) => (
                  <li key={item.id || index}>
                    <div>
                      <div className="img">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} />
                        ) : (
                          "사진"
                        )}
                      </div>
                      <div className="activity_info">
                        <h3>{item.name}</h3>
                        {item.description && <p>{item.description}</p>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="menu_wrap">
            <h2>가장 인기 있는 메뉴</h2>
            <p>최근 많은 분들이 주문한 메뉴</p>
            {isLoading ? (
              <p>메뉴 정보를 불러오는 중...</p>
            ) : menu.length > 0 ? (
              <ul>
                {menu.map((item, index) => (
                  <li key={item.menu_id || index}>
                    <div>
                      <div className="img">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.menu_name} />
                        ) : (
                          <img src={no_img} alt="대체 이미지" />
                        )}
                      </div>
                      <div className="menu_info">
                        <h3>{item.menu_name}</h3>
                        <p>
                          {item.menu_price
                            ? item.menu_price.toLocaleString() + "원"
                            : "가격 정보 없음"}
                        </p>
                        {item.description && (
                          <p className="menu_description">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>메뉴 정보가 없습니다.</p>
            )}
          </div>
        )}
      </div>
      <Footer />

      {/* 상세정보 모달 */}
      {showHoursModal && (
        <div className="modal-overlay">
          <div className="hours-modal">
            <div className="modal-header">
              <h3>
                <FaClock /> {store.place_name} 정보
              </h3>
              <button
                onClick={() => setShowHoursModal(false)}
                className="close-button"
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-content">
              <div className="info-section">
                <h4>
                  <FaPhone /> 연락처
                </h4>
                <p>
                  {restaurantData?.restaurant?.phone ||
                    store.phone ||
                    "연락처 정보가 없습니다."}
                </p>
              </div>
              <div className="info-section">
                <h4>
                  <FaMapMarkerAlt /> 위치
                </h4>
                <p className="address">
                  {restaurantData?.restaurant?.road_address ||
                    restaurantData?.restaurant?.address ||
                    store.address ||
                    "주소 정보가 없습니다."}
                </p>
                {restaurantData?.restaurant?.direction && (
                  <p className="direction">
                    {restaurantData.restaurant.direction}
                  </p>
                )}

                <div style={{ marginTop: "15px" }}>
                  <button
                    onClick={openNaverMapWithoutLocation}
                    className="map-button-alt"
                    style={{
                      padding: "10px 15px",
                      backgroundColor: "#f0f0f0",
                      color: "#333",
                      border: "1px solid #ddd",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    📍 가게 위치 보기
                  </button>
                </div>

                {locationError && (
                  <p
                    style={{
                      color: "#ff4444",
                      fontSize: "12px",
                      marginTop: "8px",
                    }}
                  >
                    {locationError === "권한 거부"
                      ? "위치 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요."
                      : "위치 정보를 가져올 수 없습니다."}
                  </p>
                )}

                {routeTime && <p>예상 소요 시간: {routeTime}분</p>}
              </div>
              <div className="info-section">
                <h4>
                  <FaStar /> 리뷰
                </h4>
                <p>
                  리뷰{" "}
                  {restaurantData?.restaurant?.review_count ||
                    store.reviewCount ||
                    0}
                  개
                </p>
              </div>
              {!isActivity && (
                <>
                  <div className="info-section">
                    <h4>
                      <FaClock /> 운영시간
                    </h4>
                    {isLoadingHours ? (
                      <p>영업시간 정보를 불러오는 중...</p>
                    ) : hoursData && hoursData.length > 0 ? (
                      <ul className="hours-list">
                        {hoursData.map((time, index) => (
                          <li key={index}>
                            <strong>{time.day}</strong>:{" "}
                            {time.start && time.end
                              ? `${time.start} ~ ${time.end}`
                              : "휴무"}
                            {time.lastOrder &&
                              ` (라스트오더: ${time.lastOrder})`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>영업시간 정보가 없습니다.</p>
                    )}
                  </div>
                  <div className="info-section">
                    <h4>🍽️ 카테고리</h4>
                    <p>
                      {restaurantData?.restaurant?.category ||
                        store.category ||
                        ""}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProductList;
