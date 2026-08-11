// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Silkline {
    uint16 public constant MAX_DAILY_MOVES = 2048;

    struct Profile {
        uint64 totalMoves;
        uint64 totalCheckIns;
        uint64 lastMoveDay;
        uint64 lastCheckInDay;
        uint64 lastMovedAt;
        uint8 streak;
        uint8 lastDirection;
    }

    mapping(address => Profile) private profiles;
    mapping(uint64 => uint8[]) private movesByDay;

    uint64 public globalMoves;
    uint64 public globalCheckIns;

    event LineExtended(
        address indexed user,
        uint64 indexed day,
        uint16 indexed position,
        uint8 direction,
        uint64 timestamp
    );

    event DailyCheckIn(
        address indexed user,
        uint64 indexed day,
        uint8 streak,
        uint64 timestamp
    );

    function extendLine(uint8 direction) external {
        require(direction < 4, "Unknown direction");

        uint64 day = uint64(block.timestamp / 1 days);
        Profile storage profile = profiles[msg.sender];
        uint8[] storage moves = movesByDay[day];

        require(profile.lastMoveDay != day, "Move already added today");
        require(moves.length < MAX_DAILY_MOVES, "Daily line is full");

        moves.push(direction);
        profile.totalMoves += 1;
        profile.lastMoveDay = day;
        profile.lastMovedAt = uint64(block.timestamp);
        profile.lastDirection = direction;
        globalMoves += 1;

        emit LineExtended(
            msg.sender,
            day,
            uint16(moves.length - 1),
            direction,
            uint64(block.timestamp)
        );
    }

    function dailyCheckIn() external {
        uint64 day = uint64(block.timestamp / 1 days);
        Profile storage profile = profiles[msg.sender];

        require(profile.lastCheckInDay != day, "Already checked in today");

        if (profile.lastCheckInDay + 1 == day) {
            if (profile.streak < type(uint8).max) {
                profile.streak += 1;
            }
        } else {
            profile.streak = 1;
        }

        profile.lastCheckInDay = day;
        profile.totalCheckIns += 1;
        globalCheckIns += 1;

        emit DailyCheckIn(
            msg.sender,
            day,
            profile.streak,
            uint64(block.timestamp)
        );
    }

    function getDayMoves(uint64 day) external view returns (uint8[] memory) {
        return movesByDay[day];
    }

    function statsOf(address user) external view returns (Profile memory) {
        return profiles[user];
    }

    function currentDay() external view returns (uint64) {
        return uint64(block.timestamp / 1 days);
    }
}
